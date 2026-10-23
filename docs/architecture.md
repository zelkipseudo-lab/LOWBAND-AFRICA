# Architecture technique — LowBand Africa

## 1. Architecture cible du prototype

Application organisée en trois modules, avec analyse synchrone et service d'historique dans le backend :

```text
frontend/  React + Vite + TypeScript + Tailwind
    │ HTTP JSON (POST /api/v1/analyze, GET/DELETE /api/v1/history)
backend/   Node.js + TypeScript + Express
    ├── validation d'entrée et de cible / limites / orchestration
    ├── moteur d'analyse Playwright (module réutilisable, pas une API publique)
    ├── score déterministe + recommandations fondées sur les observations
    └── service d'historique → port AnalysisHistoryStore → adaptateur de stockage configuré
```

Le dépôt contient ces trois modules. La persistance historique utilise un adaptateur JSON configurable pour une instance locale; le service métier dépend de l'interface `AnalysisHistoryStore`. Les comptes et les analyses asynchrones restent hors périmètre actuel.

## 2. Flux d'une analyse

1. Le frontend envoie l'URL et un identifiant de profil pris dans la liste documentée.
2. Express valide les champs, applique les limites de fréquence et autorise la cible selon `security.md`.
3. Le backend transmet au moteur une cible validée et les paramètres réseau résolus depuis une liste serveur, jamais des paramètres arbitraires du client.
4. Playwright lance une page isolée, applique les paramètres pris en charge avant la navigation, collecte les événements réseau et les entrées Performance disponibles, puis ferme le contexte.
5. Le moteur retourne des observations brutes typées et les limitations. Il ne calcule pas le score.
6. Le backend calcule le score et les recommandations, valide la réponse, puis retourne le rapport.

Le prototype utilise une requête HTTP synchrone, avec une échéance serveur globale documentée. Si l'hébergement ne peut pas maintenir la requête pendant cette durée, l'analyse asynchrone sera une décision ultérieure avec contrat dédié.

## 3. Responsabilités et frontière des modules

### Frontend

Saisie de l'URL, choix du profil, états de chargement/erreur, rendu fidèle au JSON, accessibilité. Peut vérifier la forme des champs pour l'expérience, mais n'accorde jamais la sécurité. N'invente ni mesures, ni score, ni recommandations.

### Backend

Seul point d'entrée réseau public. Valide les entrées et cibles, contrôle les redirections et les ressources, orchestre le moteur, convertit ses résultats vers le contrat API, calcule le score et les recommandations, masque les erreurs internes.

### Historique

L'orchestration enregistre le rapport API retourné par le moteur après calcul du score et des recommandations, avant d'envoyer le succès au client. Les erreurs moteur ne sont pas enregistrées; une erreur de persistance est visible comme `503 HISTORY_UNAVAILABLE`. Avant écriture, les paramètres URL dont le nom correspond aux noms de secrets courants et le fragment sont retirés de la copie historique. Le service utilise `AnalysisHistoryStore`; le chemin de stockage est une configuration de l'adaptateur, pas une dépendance métier. L'adaptateur JSON effectue des écritures atomiques et sérialise les modifications d'un processus. Un stockage partagé multi-instance peut être ajouté en implémentant cette interface.

### Moteur (mission Kimi)

Fonction interne appelée par le backend avec URL et profil déjà autorisés. Lance et nettoie Chromium/Playwright, applique seulement l'émulation effectivement supportée, collecte ce qui est mesurable et renvoie les absences comme `null` avec avertissements. Ne contient ni endpoint HTTP public, ni score, ni hypothèse de sécurité réseau autonome. Le backend doit rester la barrière SSRF.

## 4. Organisation indicative

```text
frontend/src/{components,lib,types}/
backend/src/{api,security,analysis,scoring}/
backend/src/analysis/engine/   # cible d'intégration : copie ou import du paquet local
engine/                        # prototype réellement livré par Kimi (paquet TypeScript)
docs/ agents/
```

Adapter cette structure à l'environnement et au prototype réellement livré; ne déplacer aucun fichier existant sans raison. Le prototype du moteur est actuellement dans `engine/` (décision 009); Codex l'utilise via une dépendance locale ou le copie dans `backend/src/analysis/engine/`.

## 5. Déploiement et limites

Frontend statique et backend peuvent être hébergés séparément. Le backend doit permettre Chromium/Playwright, les sorties réseau contrôlées et une mémoire/durée suffisantes. Une séparation statique seule ne rend pas l'analyse possible. La synchronisation, la capacité Chromium et les protections réseau doivent être vérifiées avant tout déploiement.

## 6. Principes

- Aucun service de stockage externe requis pour le développement local.
- Le moteur rapporte des faits; le backend applique le contrat et la méthodologie.
- Mesure absente ≠ zéro. Les limites de simulation sont visibles.
- La protection SSRF est côté serveur et complétée par l'isolation réseau.
- La stack de référence est consignée dans `DECISIONS.md`.
