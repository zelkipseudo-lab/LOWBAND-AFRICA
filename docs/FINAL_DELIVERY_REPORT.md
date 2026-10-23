# Rapport final de livraison locale — LowBand Africa

> Mise à jour ultérieure : l'historique backend a été ajouté le 2026-10-23. Voir `ETAT_DU_PROJET.md` section 13 et la section complémentaire de `docs/QA_REPORT.md`; les vérifications backend (25), moteur (80) et frontend (9) passent, total 114.

Date : 2026-10-22 (UTC)  
Mission : 6 — intégration et livraison locale  
Verdict : **LIVRABLE LOCALEMENT AVEC RÉSERVES**

## Résumé

Le dépôt a été stabilisé sans changer son architecture à trois modules. Les corrections QA prioritaires réalisables localement ont été appliquées, les trois modules compilent, leurs 107 tests automatisés passent et l'API ainsi que le frontend ont été vérifiés en local.

La réserve déterminante reste l'isolation réseau sortante : elle n'est pas installée ni vérifiée sur ce poste. Le garde-fou `LOWBAND_EGRESS_ISOLATION` est resté fermé. Aucune analyse de site public ni parcours complet de résultat via le backend réel n'est revendiqué. Le moteur a été testé sur sa fixture locale avec Chromium réel.

## Architecture finale

- **Moteur (`engine/`)** : paquet TypeScript interne Playwright/Chromium. Il applique un profil CDP, collecte uniquement les observations disponibles et laisse les valeurs inconnues à `null`.
- **Backend (`backend/`)** : API Express v1, garde SSRF, validation, limite de fréquence/concurrence, appel du moteur, calcul de score et recommandations.
- **Frontend (`frontend/`)** : interface React/Vite/TypeScript, requêtes JSON à `/api/v1`, états de chargement/erreur/résultat.
- **Mode d'usage** : développement local sur `127.0.0.1:3001` (API) et `127.0.0.1:5173` (frontend). Aucun service d'hébergement ou composant de production n'a été ajouté.

## Corrections QA

| Réf. QA | Résolution |
|---|---|
| P1-01 | **Ouvert / réserve** : aucune isolation egress vérifiable sur ce poste. Le verrou moteur reste fermé; la valeur d'environnement ne doit pas servir de contournement. |
| P2-01 | Avertissement ajouté si FCP dépasse `navigationMs`; sémantique des deux horloges documentée. Les métriques et la méthode de score ne sont pas modifiées. |
| P2-02 | Le score est présenté comme une mesure ponctuelle d'une navigation; la limite est documentée. |
| P2-03 | « Rapport officiel » et « score officiel » remplacés par des libellés d'analyse et d'indicateur expérimental. |
| P2-04 | Quota décrémenté uniquement au lancement effectif; refus de concurrence séparé en `503 ANALYSIS_BUSY`. |
| P2-05 | `LOWBAND_TRUST_PROXY` accepte une liste explicite d'adresses/sous-réseaux de confiance; configuration documentée et vide par défaut. |
| P3-01 | Routes API absentes et méthodes incorrectes répondent en enveloppe JSON (`404`/`405`). |
| P3-02 | Composantes de score et preuves de recommandations arrondies à deux décimales. |
| P3-03 | Ports autres que 80/443 renvoyés en `400 INVALID_URL`. |
| P3-04 | Retrait des filtres SSRF partiels côté client; l'API décide et renvoie l'erreur sûre. |
| P3-05 | Copie presse-papier attendue et rejet géré; « Copié » apparaît uniquement après succès. |
| P3-06 | Test statique étendu aux sources frontend TSX et test du DOM rendu ajouté via `npm.cmd run test:visual`. |
| P3-07 | Ombres Tailwind remplacées par des ombres navy; la vérification du DOM ne relève que la palette autorisée et ses transparences. |
| P3-08 | Hero corrigé pour décrire les quatre profils réels, sans annoncer de profil 2G. |
| P3-09 | L'erreur réseau n'affiche plus l'adresse locale de l'API. |
| P3-10 | `Vary: Origin`, `X-Frame-Options` et CSP restrictive ajoutés; `nosniff`, `no-store` et la désactivation de `X-Powered-By` conservés. |
| P3-11 | Vérifié dans le code courant : l'URL soumise est déjà normalisée par `trim()`. Aucun changement supplémentaire nécessaire. |
| P3-12 | `docs/HANDPFF_TEMPLATE.md` renommé `docs/HANDOFF_TEMPLATE.md`; références corrigées. |
| P3-13 | Aucun serveur n'écoutait sur 3001/5173/5174 au début des vérifications; les deux serveurs de test lancés pour cette mission ont été arrêtés ensuite. |
| P3-14 | Limites déjà documentées conservées : LCP après fenêtre de 2 s, octets partiels non comptés, échecs HTTP inclus, limites d'interception service worker et score partiel. |

## Tests et builds

Commandes exécutées dans chaque répertoire indiqué :

| Répertoire | Commande | Résultat |
|---|---|---|
| `engine/` | `npm.cmd run typecheck` | **RÉUSSI** |
| `engine/` | `npm.cmd test` | **RÉUSSI — 80 tests / 4 fichiers, 19,61 s**; comprend les tests d'intégration Chromium sur fixture locale. |
| `engine/` | `npm.cmd run build` | **RÉUSSI** |
| `backend/` | `npm.cmd run typecheck` | **RÉUSSI** |
| `backend/` | `npm.cmd test` | **RÉUSSI — 18 tests / 2 fichiers, 3,23 s**; comprend les tests de confiance proxy explicite et d'avertissement FCP. |
| `backend/` | `npm.cmd run build` | **RÉUSSI** |
| `frontend/` | `npm.cmd run typecheck` | **RÉUSSI** |
| `frontend/` | `npm.cmd test` | **RÉUSSI — 9 tests, 1,04 s**. |
| `frontend/` | `npm.cmd run build` | **RÉUSSI** — Vite produit un bundle JS de 213,01 Ko (63,43 Ko gzip) et CSS de 16,84 Ko. |
| `frontend/` | `npm.cmd run test:visual` | **RÉUSSI** — vérification du DOM de la palette, des transparences, zéro emoji et rendu des métriques nulles sans faux zéro. Réponse synthétique limitée au script QA. |
| racine | `node scripts/qa-frontend-states.mjs` | **RÉUSSI** — chargement, affichage du rapport synthétique QA, reset, soumission clavier, pied de page, erreur réseau sans adresse interne. |
| racine | `node scripts/qa-api-smoke.mjs` | **RÉUSSI** — santé 200, cibles locales/métadonnées 403, profil/protocole invalides 400, moteur verrouillé 502. |
| racine | `node scripts/qa-security-probe.mjs g1` à `g5` | **RÉUSSI** — validation, protocoles, SSRF loopback/privé/métadonnées, DNS, verrou egress, méthodes/routes; ports non permis renvoient maintenant 400. |
| racine | Vérification navigateur Playwright en ligne de commande | **RÉUSSI** — le frontend a envoyé un `POST /api/v1/analyze` réel avec URL et profil; le backend a répondu `ENGINE_UNAVAILABLE` et l'interface a affiché cette erreur. |
| racine | Vérification Playwright à 390 × 844 px | **RÉUSSI** — largeur de contenu 390 px, aucun débordement horizontal. |
| les trois modules | `npm.cmd run lint` | **NON EXÉCUTÉ** — aucun script de lint n'est défini dans les `package.json`. |

Total des suites unitaires/intégration : **107 réussites, 0 échec**. Les commandes de typecheck et de build ont réussi dans les trois modules.

## Intégration

- **Vérifié réellement** : Chromium du moteur sur fixture contrôlée; adaptation backend de rapports typés et erreurs dans les tests API; frontend vers backend pour la requête `POST`, le profil, et l'erreur de verrou; API health et refus SSRF en direct.
- **Non vérifié — raison :** une analyse publique réelle via l'application exigerait d'activer l'exécution Chromium, mais aucune politique de sortie réseau protégeant réellement ce processus n'est installée ou vérifiée dans cet environnement. Le verrou n'a donc pas été levé. Le script d'E2E public `node scripts/qa-frontend-e2e.mjs` n'a pas été exécuté pour cette raison.
- Les données synthétiques utilisées pour vérifier l'état résultat sont confinées aux scripts QA avec interception réseau; l'application n'a pas reçu de données de démonstration intégrées.

## Sécurité

- Sondes g3/g4 : loopback IPv4/IPv6, `localhost`, IP encodées, RFC1918, link-local/métadonnées, CGNAT et ULA refusées avec `403 BLOCKED_TARGET`.
- Le verrou d'analyse publique fermé a été confirmé par réponse `502 ENGINE_UNAVAILABLE`.
- Validation du protocole, des ports, des URL et des profils, réponses JSON sûres, corps de 8 KiB, concurrence, fréquence, CSP et en-têtes HTTP exercés dans les suites API et sondes.
- Aucune conclusion de sécurité complète n'est tirée : DNS rebinding, requêtes de service worker et isolation réseau effective depuis Chromium restent **NON VÉRIFIÉS**.
- Recherche locale de motifs de clés/API et fichiers `.env` : aucun fichier `.env` actif ni clé correspondante détecté; seuls les modèles `.env.example` sont présents.

## Limites connues

- L'analyse de sites publics est désactivée dans cet environnement jusqu'à la mise en place et la vérification externe de l'isolation réseau. Ne pas définir `LOWBAND_EGRESS_ISOLATION=verified` sur la seule base de la garde applicative.
- Une seule navigation produit un indicateur expérimental, pas une comparaison statistique ni une certification. FCP/LCP peuvent diverger de `load` en Chromium headless; l'avertissement l'explique sans transformer les métriques.
- DNS rebinding, service worker malveillant, Linux/containers et sites lourds/multi-ressources n'ont pas été validés dans cette campagne.
- Aucun linter n'est configuré. Les analyses réelles multiprofils ne sont pas proposées en un seul parcours d'interface.

## Utilisation locale

Prérequis : Node.js 20+, npm et Chromium Playwright. Depuis la racine, sous PowerShell :

```powershell
cd engine
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run build
cd ..\backend
npm.cmd ci
cd ..\frontend
npm.cmd ci
```

Dans deux fenêtres PowerShell séparées, depuis la racine :

```powershell
cd backend
npm.cmd run dev
```

```powershell
cd frontend
npm.cmd run dev
```

Frontend : <http://127.0.0.1:5173>. API health : <http://127.0.0.1:3001/api/v1/health>. Arrêt : `Ctrl+C` dans chaque fenêtre; redémarrage avec les mêmes commandes. Les réglages sont décrits dans `backend/.env.example`; Express ne charge pas automatiquement un fichier `.env`.

## État final

**LIVRABLE LOCALEMENT AVEC RÉSERVES.** Le frontend, l'API locale, le moteur sur fixture et les builds sont vérifiés. Le parcours d'analyse publique complet n'est pas disponible tant que l'isolation réseau sortante n'a pas été mise en place puis vérifiée. La version actuelle est destinée à une utilisation et une validation locales. Le déploiement, l'hébergement et la mise en production feront l'objet d'une étape ultérieure.
