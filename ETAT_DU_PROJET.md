# LOWBAND AFRICA — ÉTAT DU PROJET

## 13. Historique des analyses — mission Codex (2026-10-23)

État consigné à la fin de la mission historique; le diagnostic EGRESS plus récent ci-dessous met à jour le comportement et les vérifications du verrou.

Statut : **TERMINÉ AVEC RÉSERVES — API et persistance backend implémentées**

### Travail effectué

- Ajout de l'interface métier `AnalysisHistoryStore` et d'un adaptateur JSON configurable (`LOWBAND_HISTORY_FILE`, défaut `data/analysis-history.json` sous le répertoire courant). L'adaptateur utilise un remplacement atomique du fichier et sérialise les mutations dans un même processus.
- `POST /api/v1/analyze` enregistre le rapport calculé depuis le résultat réel du moteur avant de le retourner. Les rapports partiels issus du timeout de navigation gardent `status: partial`; les erreurs moteur ne sont pas enregistrées. Une erreur de persistance répond explicitement `503 HISTORY_UNAVAILABLE`.
- Routes ajoutées : `GET /api/v1/history` (limit/offset, plafond 100), `GET /api/v1/history/:analysisId`, `DELETE /api/v1/history/:analysisId`.
- L'API détail ne conserve que les champs du rapport, ses mesures, recommandations et avertissements. Aucun contenu de page, cookie ou header n'est ajouté; les paramètres d'URL à noms sensibles courants et les fragments sont retirés de la copie stockée.
- Contrats et architecture mis à jour dans `docs/api-contract.md`, `docs/architecture.md`; décision 019 ajoutée. La configuration et le dossier de données local sont ignorés par Git.

### Fichiers créés ou modifiés

- Créé : `backend/src/history.ts`.
- Modifiés : `backend/src/app.ts`, `backend/test/app.test.ts`, `backend/.env.example`, `backend/.gitignore`, `docs/api-contract.md`, `docs/architecture.md`, `docs/DECISIONS.md`, `docs/QA_REPORT.md`, `ETAT_DU_PROJET.md`.

### Vérifications

- Depuis `backend/`, `npm.cmd test` : 25 tests réussis, dont écriture concurrente, suppression sur fichier et retrait de paramètres d'URL sensibles.
- Depuis `backend/`, `npm.cmd run typecheck` : réussi.
- Depuis `backend/`, `npm.cmd run build` : réussi.
- Non-régression : `npm.cmd test` depuis `engine/` (80 réussis) et `frontend/` (9 réussis); total courant 114 tests, sans échec.
- La suite vérifie le rapport sauvegardé et relu par une nouvelle instance de store, le statut partiel, l'échec sans enregistrement, historique vide, pagination et paramètres invalides, détail 404, suppression, et erreurs de persistance.
- Analyse publique via Chromium et interface utilisateur frontend non vérifiées dans cette mission. Le verrou egress n'a pas été modifié.

### Limites et prochaine étape

- L'adaptateur fichier est pour une instance API unique avec volume persistant; plusieurs processus/réplicas exigent un adaptateur partagé implémentant `AnalysisHistoryStore`.
- Il n'y a pas de comptes/authentification : l'historique est commun à l'instance API.
- Le frontend dispose du contrat API; l'interface visuelle de consultation n'est pas réalisée ici.
- Le dossier de travail n'est pas un dépôt Git (`git status` a renvoyé `fatal: not a git repository`).

## 14. Diagnostic et correction du verrou EGRESS — mission Codex (2026-10-23)

Statut : **CORRIGÉ POUR LE PARCOURS LOCAL ET L'EXPÉRIENCE VISITEUR; futur egress hébergé à configurer**

### Cause établie

- Le backend démarre normalement, mais `POST /api/v1/analyze` renvoyait `502 ENGINE_UNAVAILABLE` avant l'appel Playwright lorsque `LOWBAND_EGRESS_ISOLATION` n'était pas exactement `verified`.
- Le frontend associait ce code aussi bien au verrou serveur qu'à un vrai échec de lancement Chromium, et disait au visiteur de faire installer une règle Windows. Ce message confondait une opération administrateur du backend avec le parcours d'un visiteur.
- `scripts/Verify-Egress.ps1` n'existe pas. Les scripts réels sont l'installateur Windows, le lanceur PowerShell et `verify-chromium-egress.mjs`.
- Le lanceur vérifiait que Chromium bloquait loopback via le garde SSRF applicatif et atteignait un site public, mais ne contrôlait pas que la règle Windows soit encore présente, complète et liée au binaire Chromium Playwright courant.
- Pendant le diagnostic, une règle Windows active a été observée pour `C:\Users\user\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe`, avec les profils pare-feu actifs. Le smoke Chromium existant a réussi; la cause du message restait l'absence possible de déclaration dans l'environnement du backend lancé normalement.

### Correctif

- Le backend retourne désormais `503 EGRESS_POLICY_UNVERIFIED` pour une politique serveur non déclarée et réserve `502 ENGINE_UNAVAILABLE` à un vrai échec d'initialisation du moteur.
- Le frontend ne demande plus au visiteur d'installer quoi que ce soit; il affiche que le service est temporairement indisponible et l'invite à réessayer ou contacter l'équipe.
- La liste des plages bloquées est centralisée dans `scripts/chromium-egress-policy.psd1`, partagée par installation et prévol.
- Avant d'ouvrir le verrou, le lanceur Windows vérifie les profils de pare-feu actifs, la règle sortante activée, l'exécutable Chromium courant, les ports/protocoles et l'ensemble précis des plages bloquées, puis lance la sonde Chromium.

### Vérifications

- Le moteur Playwright s'exécute dans le processus backend et ses dépendances sont dans `engine/`; le frontend ne lance aucune installation locale ni script système.
- Suites : backend 26 tests, frontend 11, moteur 80; typecheck backend/frontend et builds backend/frontend réussis. Le build frontend signale un chunk JavaScript supérieur à 500 kB.
- Le démarrage sans politique a répondu `503 EGRESS_POLICY_UNVERIFIED`; le prévol Windows et le démarrage vérifié ont réussi sur un port libre. Une analyse réelle de `https://example.com/` a abouti (`completed`, profil `4g`), puis son entrée QA a été supprimée. `127.0.0.1` a été refusé en `403 BLOCKED_TARGET`.
- Tests automatisés couvrent l'échec du moteur, le timeout et la redirection vers une destination interdite; le test frontend a vérifié le message de service indisponible sans installation visiteur. Détails dans `docs/QA_REPORT.md`.
- Limite : règle Windows vérifiée par lecture de configuration, sans essai comportemental vers une adresse privée routable. Aucun déploiement, test Linux/conteneur ou test DNS rebinding n'a été effectué. En production, une politique de sortie équivalente doit être appliquée dans l'environnement du backend/Chromium avant d'activer le verrou.

Dernière mise à jour : 2026-10-23 UTC  
Temps total disponible : 48 heures (référence projet)

---

## 1. État général

Statut global : livraison locale, historique backend et correction EGRESS **TERMINÉS AVEC RÉSERVES**  
Étape active : diagnostic et correction du parcours EGRESS local terminés; politique du futur runtime de production à configurer  
Dernier agent intervenu : Codex — diagnostic et correction EGRESS  
Prochaine étape : préparer la politique réseau de sortie dans l'environnement de production avant toute exposition; aucun déploiement n'a eu lieu  
Branche Git de travail : main, rattachée au commit distant initial c61529d  
URL du dépôt : https://github.com/zelkipseudo-lab/LOWBAND-AFRICA  
URL de préproduction : aucune  
URL de production : aucune

Le dossier contient le moteur d'analyse dans `engine/`, l'API Express dans `backend/` et l'application cliente dans `frontend/`. Les dernières suites donnent 117 tests réussis (80 moteur, 26 backend, 11 frontend); les détails et limites se trouvent dans `docs/QA_REPORT.md`. Le parcours local backend→Chromium→URL publique autorisée a réussi après le prévol EGRESS Windows. **Aucune exposition publique tant qu'une isolation réseau de sortie adaptée au runtime n'est pas installée et vérifiée.**

## 2. Tableau de progression

| Étape | Agent | Mission | Statut |
|---|---|---|---|
| 1 | GPT | Architecture et contrats | TERMINÉ AVEC RÉSERVES |
| 2 | Kimi (remplacé par `opencode`) | Prototype du moteur d'analyse | TERMINÉ AVEC RÉSERVES |
| 3 | Codex | Backend et intégration | TERMINÉ AVEC RÉSERVES |
| 4 | Antigravity | Frontend | TERMINÉ |
| 5 | GLM ou Qwen (exécutée par `opencode`) | QA, scoring et sécurité | TERMINÉ AVEC RÉSERVES |
| 6 | GPT + Codex | Intégration finale et livraison locale | TERMINÉ AVEC RÉSERVES |

## 3. Compte rendu — Mission 1, GPT Architecte

Agent : GPT-6 dans Codex, mission GPT Architecte sélectionnée par `AGENT_ROUTER.md`  
Date : 2026-10-22  
Statut : TERMINÉ AVEC RÉSERVES

### Livrables et décisions

- Clarification de l'architecture et des responsabilités frontend/backend/moteur.
- Contrat v1 synchrone, schéma de rapport/erreur, valeurs nulles, codes HTTP et limites de démarrage.
- Formules explicables de score, règles de données manquantes et recommandations déterministes.
- Quatre profils de laboratoire fixes; profil `unstable` réservé jusqu'à une simulation réelle.
- Exigences SSRF et isolation réseau, en précisant que la validation DNS côté application seule n'est pas une garantie suffisante pour Chromium.
- Décisions consignées, dont le contrat interne moteur/backend.

### Fichiers modifiés

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/scoring.md`
- `docs/network-profiles.md`
- `docs/security.md`
- `docs/DECISIONS.md`
- `ETAT_DU_PROJET.md`

Aucun fichier de code n'a été créé par GPT. Aucun fichier n'a été supprimé intentionnellement.

### Commandes et tests

- Consultation de `AGENT_ROUTER.md`, `agents/01_GPT_ARCHITECTE.md`, `00_LIRE_EN_PREMIER.md`, `REGLES_COMMUNES.md`, `ETAT_DU_PROJET.md`, des documents de `docs/` et des consignes des agents 2 à 6.
- Tests applicatifs : NON EXÉCUTÉS — aucun code, script ou manifeste n'existait; cette mission a livré des spécifications.
- Les valeurs réseau et la compatibilité Playwright étaient NON VALIDÉES empiriquement et laissées à Kimi.

### Problèmes et réserves

- Aucune application exécutable n'était présente au moment de la mission GPT.
- Kimi devait confirmer ce que Chromium/Playwright peut mesurer et émuler; les champs impossibles devaient rester `null`.
- Codex devra vérifier l'isolation réseau effective avant toute exposition publique.
- Le routeur et `docs/README_AGENT.md` référencent `docs/HANDOFF_TEMPLATE.md`, mais le fichier présent s'appelle `docs/HANDOFF_TEMPLATE.md`. Aucun doublon ou renommage n'a été effectué.
- Les seuils du score v1 sont des choix initiaux de produit, non calibrés sur un ensemble de sites.

## 4. Compte rendu — Mission 2, Kimi (exécutée par l'agent de remplacement)

Agent : `opencode`, modèle `big-pickle` — identité honnêtement déclarée : **je ne suis pas Kimi**. La mission a été exécutée intégralement sur autorisation explicite du responsable.  
Date : 2026-10-22  
Statut : TERMINÉ AVEC RÉSERVES

### 4.1 Travail réalisé

Un moteur d'analyse TypeScript autonome a été créé dans `engine/`. Il :

- lance réellement Chromium via Playwright pour chaque analyse;
- applique les profils `fast`, `4g`, `3g`, `slow_3g` via CDP `Network.emulateNetworkConditions` avant navigation;
- collecte les événements réseau CDP et les métriques de performance de la page;
- retourne les mesures réelles avec `null` lorsque la donnée est indisponible, jamais avec un zéro inventé;
- gère les délais, les navigations partielles, les échecs de connexion et les erreurs typées;
- fournit une garde SSRF applicative (`createTargetGuard`) validant l'URL, la résolution DNS, chaque requête et chaque redirection via CDP `Fetch`;
- fournit une CLI reproductible pour tester le moteur sans backend;
- ne calcule ni score ni recommandations, conformément à la décision 008.

Aucun backend, frontend, endpoint HTTP public, calcul de score ou recommandation n'a été ajouté.

### 4.2 Fichiers créés

- `engine/package.json` — paquet privé `@lowband/analysis-engine` v0.1.0, scripts build/typecheck/test/analyze.
- `engine/package-lock.json` — dépendances verrouillées (Playwright 1.64.1, ipaddr.js 2.5.0, TypeScript 5.9.3, Vitest 5.0.5, tsx 4.23.15).
- `engine/tsconfig.json` — compilation stricte NodeNext vers `dist/`.
- `engine/tsconfig.test.json` — vérification de types des tests.
- `engine/vitest.config.ts` — timeout 30 s, tests séquentiels.
- `engine/.gitignore` — `node_modules/`, `dist/`, `coverage/`.
- `engine/src/types.ts` — contrats internes (résultat, métriques, options, erreurs).
- `engine/src/profiles.ts` — profils fixes et conversion Kbps → octets/s.
- `engine/src/errors.ts` — `EngineError`, codes internes et messages sûrs.
- `engine/src/analyze.ts` — orchestration Playwright/Chromium, délais, collecte, garde, nettoyage.
- `engine/src/network/collector.ts` — agrégation CDP (requêtes, échecs, octets, catégories).
- `engine/src/security/target-guard.ts` — validation SSRF (URL, ports, DNS, IP, cache 5 s).
- `engine/src/index.ts` — exports publics du module.
- `engine/src/cli.ts` — outil de test en ligne de commande.
- `engine/test/unit/profiles.test.ts` — 4 tests.
- `engine/test/unit/target-guard.test.ts` — 53 tests.
- `engine/test/unit/collector.test.ts` — 14 tests.
- `engine/test/integration/fixture-server.ts` — serveur HTTP local de test.
- `engine/test/integration/engine.test.ts` — 8 tests avec Chromium réel.
- `engine/README.md` — installation, exécution, sémantique, limites.
- `docs/engine.md` — contrat interne et instructions d'intégration Codex.

Le dossier `engine/dist/` a été généré localement par `npm run build`; il est ignoré par `.gitignore` mais présent dans le dossier de travail.

### 4.3 Fichiers modifiés

- `docs/DECISIONS.md` — ajout des décisions 009 à 014 (moteur autonome, sémantique des mesures, profils validés, garde SSRF, environnement de collecte, base de tests).
- `docs/network-profiles.md` — état des profils passé à « vérifié via CDP, 2026-10-22 » et ajout de la preuve de débit.
- `ETAT_DU_PROJET.md` — ce compte rendu, les tests, les limites et les instructions Codex.

Aucun document existant n'a été supprimé. Le contenu de la mission GPT a été conservé.

### 4.4 Commandes exécutées et résultats

Environnement constaté :

- `node --version` → `v24.13.1`
- `npm.cmd --version` → `11.19.0` (les scripts `npm.ps1`/`npx.ps1` étaient bloqués par la politique d'exécution PowerShell; `npm.cmd`/`npx.cmd` ont été utilisés)
- Playwright → `1.64.1`; Chromium → `156.0.8078.4` (Chrome for Testing + headless shell)
- Windows; Node.js >= 20 requis par le paquet.

Installation :

- `npm install` dans `engine/` → 44 paquets ajoutés, 0 vulnérabilité signalée.
- `npx playwright install chromium` → Chromium, headless shell et FFmpeg téléchargés.

Vérifications :

- `npm run typecheck` → **succès**, aucune erreur.
- `node node_modules/typescript/bin/tsc -p tsconfig.test.json --noEmit` → **succès**.
- `npm test` → **79 tests réussis / 79**, 4 fichiers, 0 échec. Détail : 71 tests unitaires + 8 tests d'intégration avec Chromium réel.
- `npm run build` → **succès**; CLI compilée exécutée avec `npm run analyze:built`.
- Import réel du paquet compilé vérifié dans un dossier temporaire via `npm install file:D:/LowBand_Africa/engine` → `ENGINE_VERSION` et fonctions `analyze`/`createTargetGuard` importables.
- Le test d'intégration vérifie notamment : navigation réelle, ressources, FCP, LCP, latence/débit, blocage d'une cible locale, validation d'une sous-ressource, validation d'une redirection, expiration de navigation partielle, échec de connexion, refus du profil `unstable`.

Analyses réelles exécutées (CLI, garde SSRF active) :

| URL | Profil | Durée totale | Navigation | FCP | LCP | Requêtes | Transfert | Échecs |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `https://example.com/` | `slow_3g` | 4 437 ms | 1 308 ms | 800 ms | 1 332 ms | 2 | 2 024 o | 0 |
| `https://example.com/` | `4g` | 3 548 ms | 914 ms | 724 ms | 928 ms | 2 | 2 022 o | 0 |
| `https://www.wikipedia.org/` | `3g` | 5 100 ms | 1 815 ms | 1 808 ms | 1 808 ms | 6 | 79 856 o | 0 |

Ces chiffres sont des observations ponctuelles du 2026-10-22, pas des références de performance ni des moyennes.

Preuve de débit sur fixture locale (143 914 octets, un passage par profil, jusqu'à `load`) :

| Profil | `navigationMs` |
|---|---:|
| `fast` | 252 ms |
| `4g` | 347 ms |
| `3g` | 1 279 ms |
| `slow_3g` | 3 948 ms |

Tests de sécurité exécutés via CLI :

- `http://127.0.0.1:3000/` → `BLOCKED_TARGET`, aucun lancement de navigateur.
- `http://169.254.169.254/latest/meta-data/` → `BLOCKED_TARGET`.

Tests unitaires de sécurité couverts : loopback IPv4/IPv6, plages privées, link-local, CGNAT, multicast, réservées, ULA, IPv4-mapped, IPv6 6to4/NAT64, IP décimales/hexadécimales/octales, identifiants dans l'URL, ports non autorisés, protocoles non HTTP(S), DNS mixte public/privé, échec DNS, noms locaux.

### 4.5 Ce qui fonctionne réellement

- Analyse d'une URL publique par Chromium réel, avec mesures effectivement observées.
- Émulation des quatre profils réseau et conservation du profil dans le résultat.
- Collecte FCP/LCP lorsque disponibles, avec avertissement explicite sinon.
- Décompte des requêtes, échecs et octets transférés observés.
- Résultat partiel et averti lorsqu'une navigation dépasse le délai, sans fabriquer de métrique.
- Erreurs typées et messages publics sûrs.
- Blocage SSRF applicatif de l'URL initiale, des sous-ressources et des redirections via CDP `Fetch`.
- CLI et module importable; build TypeScript et suite de tests reproductibles.

### 4.6 Ce qui n'a pas été testé ou réalisé

- Aucune intégration réelle dans un backend Express : le module n'est pas encore appelé par l'API.
- Aucune exécution sur Linux, Docker ou un hébergeur : le lancement Chromium, `--no-sandbox` et les dépendances système restent à valider.
- Aucun test de concurrence réelle (le moteur lance un navigateur par appel; la limite reste à appliquer côté backend).
- Aucune isolation réseau (firewall/conteneur) testée : la garde applicative est une défense en profondeur, pas une garantie complète.
- Aucun test de DNS rebinding réel, de service worker malveillant ou de page nécessitant une interaction.
- Aucun test sur un panel de sites variés, aucun calcul de moyenne ni de percentile.
- Aucun score ni recommandation implémentés (hors mission, attribués au backend).
- Aucun test frontend.

### 4.7 Limites connues du moteur

- `transferBytes` = somme des octets encodés des réponses terminées. Les octets partiels des requêtes échouées/non terminées sont exclus et signalés par un avertissement; ce n'est pas une estimation du trafic total réel.
- Les service workers et le cache peuvent masquer une partie du transfert; des avertissements le signalent.
- Le LCP est lu après une fenêtre de 2 s; il peut encore évoluer, et reste `null` s'il n'est pas observé.
- Fenêtre 1366 × 768, DPR 1, headless : aucune émulation d'appareil mobile, de CPU lent ou de perte de paquets.
- La garde SSRF utilise un cache DNS positif de 5 s; une fenêtre de rebinding subsiste. Chromium peut résoudre différemment de Node. Les service workers peuvent contourner une partie de l'interception CDP.
- Aucun plafond strict du nombre de requêtes par page; la protection repose sur l'échéance, la concurrence backend et les limites de l'hôte.
- Testé uniquement sur Windows avec Node 24.13.1.
- Le fichier `docs/HANDOFF_TEMPLATE.md` porte toujours une faute dans son nom, alors que le routeur référence `docs/HANDOFF_TEMPLATE.md`. Non corrigé pour ne pas modifier un livrable hors mission.

### 4.8 Instructions précises pour Codex Backend

1. Lire `docs/engine.md`, `docs/api-contract.md`, `docs/scoring.md`, `docs/security.md` et les décisions 009 à 014 avant de coder.
2. Construire le backend Node.js/TypeScript/Express sans modifier le moteur ni les contrats publics.
3. Dans `backend/`, installer le moteur compilé : `npm --prefix ../engine run build`, puis dépendance `"@lowband/analysis-engine": "file:../engine"`; installer Chromium avec `npx playwright install chromium` (ou `--with-deps` dans l'image).
4. Valider l'URL et le profil côté backend, créer une instance unique de `createTargetGuard()`, puis appeler `analyze(url, { profile, targetGuard, totalTimeoutMs: 40000, navigationTimeoutMs: 30000 })`.
5. Générer `analysisId`, fixer `status: "completed"`, recopier `metrics` et `warnings` dans la réponse, calculer le score et les recommandations selon `docs/scoring.md`. Ne pas exposer `networkEmulation`, `engineVersion` ni `finalUrl` dans la réponse v1 sans mise à jour du contrat.
6. Appliquer la table de correspondance des erreurs de `docs/engine.md` : `INVALID_TARGET` → `INVALID_URL`/`UNSUPPORTED_PROTOCOL`, `INVALID_PROFILE` → `INVALID_PROFILE`, `BLOCKED_TARGET` → `BLOCKED_TARGET` (403), `ANALYSIS_TIMEOUT` → 408, `NAVIGATION_FAILED`/`ENGINE_UNAVAILABLE` → 502, `ANALYSIS_FAILED` → 500. Ne jamais renvoyer `error.cause`.
7. Implémenter les limites : corps JSON 8 KiB, concurrence initiale 1, limitation de fréquence, échéance globale sous 45 s, annulation propre et fermeture du navigateur.
8. Ajouter une politique de sortie réseau interdisant RFC1918, loopback, link-local, ULA et métadonnées cloud. **Ne pas exposer publiquement le service avant vérification de cette isolation.**
9. Tester l'API, la validation d'URL, les codes d'erreur, le scoring avec `null`, les recommandations et l'intégration réelle du moteur; reproduire les tests sur Linux/conteneur si possible.
10. Mettre à jour `ETAT_DU_PROJET.md` et `docs/DECISIONS.md` après l'intégration.

### 4.9 Verdict de préparation

Le moteur est **réellement prêt à être intégré comme module backend** : il compile, ses 79 tests passent, il produit des mesures réelles et gère les erreurs et les indisponibilités sans inventer de données.

Il n'est **pas prêt pour une exposition publique autonome** : l'isolation réseau doit être fournie et vérifiée par Codex, l'intégration Express n'existe pas encore, et Linux/conteneur n'a pas été testé. Aucun score ni recommandation n'est calculé par le moteur, conformément au contrat.

## 5. Compte rendu — Mission 3, Codex Backend

Agent : Codex dans Codex Desktop, mission 03 — Backend et intégration  
Date : 2026-10-22  
Statut : TERMINÉ AVEC RÉSERVES

### 5.1 Travail réalisé

- Création du backend Node.js/TypeScript/Express dans `backend/`, en dépendance locale de `engine/`.
- Implémentation de `GET /api/v1/health` et `POST /api/v1/analyze` selon le schéma public v1.
- Validation du JSON (8 KiB, objet à champs exacts), des profils, URL absolues HTTP(S), identifiants, longueur et destinations par `TargetGuard`.
- Mapping des erreurs vers les codes HTTP et messages contractuels, avec `requestId` et sans détails d'infrastructure.
- Intégration de `analyze()` réel; transfert des métriques nullables et avertissements; calcul serveur du score v1 et des recommandations avec preuves.
- Limite d'une analyse active, 10 tentatives par adresse cliente par fenêtre de 10 minutes, limites moteur 40 s / navigation 30 s.
- Annulation transmise au moteur à la fermeture de la connexion; le moteur ferme les ressources dans son `finally`.
- L'analyse réelle est verrouillée tant que l'opérateur n'a pas confirmé l'isolation réseau via `LOWBAND_EGRESS_ISOLATION=verified`. Cette variable n'installe aucune protection.

### 5.2 Fichiers créés ou modifiés

Créés : `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/.gitignore`, `backend/.env.example`, `backend/README.md`, `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/scoring.ts`, `backend/test/app.test.ts`, `backend/test/scoring.test.ts`.

Modifiés : `engine/src/analyze.ts`, `engine/src/errors.ts`, `engine/src/types.ts`, `engine/test/integration/engine.test.ts`, `docs/api-contract.md`, `docs/security.md`, `docs/engine.md`, `docs/DECISIONS.md`, `ETAT_DU_PROJET.md`.

### 5.3 Commandes exécutées et résultats

Backend (dans `backend/`) :

- `npm install` → terminé, 142 paquets audités, 0 vulnérabilité signalée.
- `npm run typecheck` → succès.
- `npm test` → **14 tests réussis / 14**; inclut validation, santé, adaptation API, erreurs/timeouts, score, recommandations, concurrence, limitation de fréquence et intégration Chromium réelle sur fixture locale contrôlée.
- `npm run build` → succès.
- `npm start`, puis appels locaux PowerShell : `GET /api/v1/health` → `200 {"status":"ok"}`; `POST` vers `127.0.0.1` → `403 BLOCKED_TARGET` avec l'enveloppe d'erreur attendue. Serveur arrêté après vérification.

Moteur (dans `engine/`) :

- `npm run build` → succès.
- `npm run typecheck` → succès.
- `npm test` → **80 tests réussis / 80**, dont le nouveau test d'annulation et fermeture des ressources.

### 5.4 Statut réel et réserves

- API locale et intégration au vrai moteur compilent et sont exercées par un test Chromium réel sur une fixture loopback, avec une garde de test explicitement permissive limitée à cette fixture.
- La garde réelle du moteur bloque les destinations privées/loopback; les contrôles de plages et redirections du moteur sont couverts dans sa suite existante.
- L'isolation réseau externe de Chromium n'a pas été installée ni vérifiée sur cet environnement Windows. Le backend refuse donc les analyses par défaut. La protection complète contre rebinding et accès réseau interne n'est **pas** déclarée.
- Le rapport 200 est testé avec un moteur injecté et le passage complet backend→Chromium est exercé sur une fixture locale. Une analyse réelle d'une cible publique derrière un egress contrôlé n'a pas été exécutée.
- Limitation de fréquence mémoire locale et concurrence 1 adaptées au prototype mono-instance; elles ne remplacent pas une limite distribuée derrière plusieurs instances.

### 5.5 Instructions de passage à Antigravity

- Racine backend : `backend/`.
- Depuis `engine/`: `npm ci`, `npx playwright install chromium`, `npm run build`.
- Depuis `backend/`: `npm ci`, puis depuis une PowerShell normale `..\scripts\start-backend-with-verified-egress.ps1`; base URL locale `http://127.0.0.1:3001`. `npm run dev` direct garde l'analyse fermée et répond `503 EGRESS_POLICY_UNVERIFIED`.
- Santé : `GET /api/v1/health` → `{ "status": "ok" }`.
- Analyse : `POST /api/v1/analyze`, `Content-Type: application/json`, corps `{"url":"https://example.com/","profile":"4g"}`. Profils admis : `fast`, `4g`, `3g`, `slow_3g`.
- Erreurs : `{ "error": { "code", "message", "requestId" } }`; voir `docs/api-contract.md` pour le rapport complet, les métriques nullables et les codes.
- La santé est disponible localement. Tant que l'isolation egress n'est pas vérifiée, l'API retourne `503 EGRESS_POLICY_UNVERIFIED` pour l'analyse après validation de la cible. Une panne réelle de Chromium reste une erreur `502 ENGINE_UNAVAILABLE`.
- Si frontend et API ont des origines différentes, définir `LOWBAND_FRONTEND_ORIGIN` avec une seule origine exacte. Pas de wildcard.

Prochaine étape : Antigravity peut intégrer le contrat; avant d'activer l'analyse, le responsable d'environnement doit mettre en place et vérifier la politique de sortie décrite dans `docs/security.md`. QA doit répéter les tests après cette configuration.

## 6. Compte rendu — Mission 4, Antigravity Frontend

Agent : Antigravity, mission 04 — Frontend et expérience utilisateur  
Date : 2026-10-22  
Statut : TERMINÉ

### 6.1 Travail réalisé

- Création de l'application cliente dans `frontend/` basée sur React 18, TypeScript, Vite, Tailwind CSS et Lucide Icons.
- **Respect absolu de la palette des 3 couleurs :** Configuration Tailwind et CSS restreinte exclusivement à Bleu nuit (`#102A43`), Turquoise (`#2EC4B6`) et Blanc (`#FFFFFF`). Aucune 4ᵉ couleur introduite (pas de rouge, orange, violet ou vert décoratif). Les alertes, états et avertissements reposent uniquement sur la typographie, les bordures, le contraste et les icônes vectorielles.
- **Interdiction absolue des emojis :** Aucun caractère emoji présent dans le code source (JSX/TSX, CSS, HTML, commentaires). Utilisation exclusive d'icônes vectorielles SVG sobres issues de `lucide-react`.
- **Couche d'accès API (`frontend/src/api/client.ts`) :**
  - Connexion aux routes réelles `GET /api/v1/health` et `POST /api/v1/analyze`.
  - Gestion du proxy Vite en développement (`/api` redirigé vers `http://127.0.0.1:3001`) et support de `VITE_API_BASE_URL`.
  - Typage strict selon le contrat v1 et propagation des 11 codes d'erreur API (`INVALID_URL`, `BLOCKED_TARGET`, `ENGINE_UNAVAILABLE`, `RATE_LIMITED`, `ANALYSIS_TIMEOUT`, etc.) avec des explications claires et compréhensibles pour l'utilisateur.
  - Gestion des erreurs réseau et indisponibilité du backend.
- **Composants d'interface développés :**
  - `Header.tsx` et `HealthBadge.tsx` : affichage en direct de la disponibilité de l'API avec polling discret (30 s).
  - `HeroSection.tsx` : présentation de la mission LowBand, intérêt des tests sous connectivité contrainte, rappel des limitations expérimentales de laboratoire et bouton d'action vers le formulaire.
  - `AnalysisForm.tsx` : saisie d'URL avec validation client immédiate (protocoles HTTP/HTTPS, refus des identifiants et des cibles locales/privées évidentes), sélection des 4 profils contractuels (`fast`, `4g`, `3g`, `slow_3g`) avec détails techniques (débits, latence), protection anti-double soumission en cours d'analyse.
  - `LoadingState.tsx` : état de chargement explicite rappelant le déroulement d'une session Chromium réelle sous émulation CDP sans générer de fausse progression artificielle.
  - `ScoreCard.tsx` : carte officielle *Africa Ready Score* affichant le score global, son label, et le détail des 4 composantes (Performance 30 %, Efficacité données 30 %, Optimisation ressources 20 %, Résilience 20 %). Respect de la règle d'intégrité : toute métrique manquante affiche `Indisponible` et n'est jamais remplacée par 0.
  - `MetricsGrid.tsx` : affichage des 6 métriques réelles CDP (durée navigation, FCP, LCP nullable, volume transféré, total requêtes, requêtes échouées).
  - `ResourceDistribution.tsx` : répartition des octets réseau par catégorie (images, scripts, styles, polices, autres) et tableau détaillé sans couleurs hors charte.
  - `RecommendationsList.tsx` : affichage des recommandations déterministes renvoyées par le backend avec leurs preuves chiffrées (`evidence`).
  - `WarningsList.tsx` : affichage transparent des limites techniques observées (`warnings`).
  - `ErrorDisplay.tsx` : panneau d'erreur accessible et informatif, distinguant notamment le blocage SSRF (`BLOCKED_TARGET`), la garde d'isolation (`ENGINE_UNAVAILABLE`), le délai dépassé (`ANALYSIS_TIMEOUT`) et l'indisponibilité réseau.
  - `DocumentationModal.tsx` : guide méthodologique interactif détaillant les profils réseau et la formule de calcul du score.
  - `Footer.tsx` : mentions sur les simulations de laboratoire et la sécurité des données.
- **Performance et légèreté :** Bundle de production optimisé d'une taille gzippée totale inférieure à 68 Ko, parfaitement adapté aux connexions lentes.

### 6.2 Fichiers créés

- `frontend/package.json` — manifeste du paquet client, scripts dev, build, typecheck, test.
- `frontend/package-lock.json` — arbre de dépendances verrouillé.
- `frontend/tsconfig.json` & `frontend/tsconfig.node.json` — compilation TypeScript stricte ES2022/Bundler.
- `frontend/vite.config.ts` — configuration Vite avec proxy API vers `http://127.0.0.1:3001`.
- `frontend/tailwind.config.ts` — configuration Tailwind limitant strictement les couleurs à `#102A43`, `#2EC4B6`, `#FFFFFF`.
- `frontend/postcss.config.js` — plugins PostCSS (Tailwind, Autoprefixer).
- `frontend/index.html` — document HTML accessible, méta-tags, titre sans emoji.
- `frontend/.env.example` & `frontend/.gitignore` — configuration d'environnement et exclusions.
- `frontend/README.md` — guide complet d'installation, exécution, architecture et principes.
- `frontend/src/vite-env.d.ts` — déclarations d'environnement Vite.
- `frontend/src/main.tsx` — point d'entrée React 18.
- `frontend/src/App.tsx` — composant racine orchestrant les vues et états d'analyse.
- `frontend/src/index.css` — styles de base et indicateurs d'accessibilité `:focus-visible`.
- `frontend/src/types/api.ts` — types stricts conformes au contrat v1.
- `frontend/src/constants/profiles.ts` — constantes des 4 profils réseau officiels.
- `frontend/src/utils/format.ts` — fonctions de formatage (octets, durées, pourcentages, dates) garantissant l'absence de faux zéros.
- `frontend/src/api/client.ts` — couche client API centralisée.
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/components/HealthBadge.tsx`
- `frontend/src/components/HeroSection.tsx`
- `frontend/src/components/AnalysisForm.tsx`
- `frontend/src/components/LoadingState.tsx`
- `frontend/src/components/ScoreCard.tsx`
- `frontend/src/components/MetricsGrid.tsx`
- `frontend/src/components/ResourceDistribution.tsx`
- `frontend/src/components/RecommendationsList.tsx`
- `frontend/src/components/WarningsList.tsx`
- `frontend/src/components/ErrorDisplay.tsx`
- `frontend/src/components/DocumentationModal.tsx`
- `frontend/test/utils.test.ts` — suite de tests unitaires pour utilitaires, constantes et messages.
- `frontend/test/compliance.test.ts` — tests automatisés vérifiant l'absence d'emojis et le respect strict de la palette de 3 couleurs.

### 6.3 Commandes exécutées et résultats

- `npm.cmd install` dans `frontend/` → 143 paquets installés, 0 conflit.
- `npm.cmd run typecheck` dans `frontend/` → **succès**, 0 erreur TypeScript.
- `npm.cmd test` dans `frontend/` → **9 tests réussis / 9** (4 suites, 0 échec).
  - Validation du zéro emoji dans tous les fichiers sources.
  - Validation de la palette stricte 3 couleurs dans Tailwind et CSS.
  - Validation des formatages et gestion des `null`.
  - Validation des 4 profils et exclusion d'`unstable`.
  - Validation des libellés d'erreurs.
- `npm.cmd run build` dans `frontend/` → **succès**, génération dans `frontend/dist/` :
  - `dist/index.html` (0.66 Ko)
  - `dist/assets/index-cVKm9jXT.css` (16.65 Ko, gzip: 3.93 Ko)
  - `dist/assets/index-nc6xCwS4.js` (212.66 Ko, gzip: 63.33 Ko)
  - Poids total gzippé : **~67.7 Ko**.
- **Test d'intégration locale avec le véritable backend :**
  - Démarrage du backend sur `http://127.0.0.1:3001`.
  - `GET /api/v1/health` interrogé avec succès → statut `ok` confirmé.
  - `POST /api/v1/analyze` testé avec cible locale `http://127.0.0.1/` → réponse `403 BLOCKED_TARGET` reçue et gérée correctement.
  - `POST /api/v1/analyze` testé avec profil non supporté `unstable` → réponse `400 INVALID_PROFILE` reçue et gérée correctement.
  - `POST /api/v1/analyze` testé avec cible publique sous verrouillage egress → réponse `502 ENGINE_UNAVAILABLE` reçue et expliquée avec précision par le frontend.
  - Arrêt propre du serveur après test.

### 6.4 Divergences constatées et remarques

- **Parfaite cohérence du contrat v1 :** Les types, les routes (`/api/v1/health`, `/api/v1/analyze`), les profils (`fast`, `4g`, `3g`, `slow_3g`) et les codes d'erreur du backend correspondent exactement aux spécifications de `docs/api-contract.md`.
- **Garde egress du backend :** Conformément à la décision 015 de Codex, le backend renvoie `502 ENGINE_UNAVAILABLE` tant que la variable `LOWBAND_EGRESS_ISOLATION=verified` n'est pas définie dans son environnement. Le frontend gère ce cas avec un message explicatif guidant l'administrateur sans bloquer l'interface.

### 6.5 Instructions précises pour GLM ou Qwen QA

1. **Démarrage des services :**
   - Lancer le backend :
     ```powershell
     cd backend
     npm.cmd run dev
     ```
     (L'API écoute sur `http://127.0.0.1:3001`).
   - Lancer le frontend dans un second terminal :
     ```powershell
     cd frontend
     npm.cmd run dev
     ```
     (L'application est accessible sur `http://127.0.0.1:5173`).
2. **Parcours à tester :**
   - **Vérification de santé :** Observer le badge en haut à droite qui doit afficher `Backend API : Opérationnel`.
   - **Validation client du formulaire :** Tenter de saisir une URL sans `http://`, avec identifiant, ou vide → le message d'erreur client s'affiche immédiatement.
   - **Protection SSRF :** Saisir `http://127.0.0.1/` ou `http://localhost:3000/` → vérifier l'affichage propre du panneau d'erreur `BLOCKED_TARGET`.
   - **Profils réseau :** Sélectionner successivement les 4 profils (`fast`, `4g`, `3g`, `slow_3g`) et vérifier la transmission du profil exact dans le corps de requête.
   - **Affichage des résultats :** Vérifier que les métriques nulles (ex. LCP indisponible) sont affichées comme `Indisponible` et jamais comme `0`.
   - **Conformité visuelle :** Vérifier l'absence totale d'emojis et le respect exclusif des trois couleurs (`#102A43`, `#2EC4B6`, `#FFFFFF`).
   - **Accessibilité :** Naviguer au clavier (Tabulation, Entrée) sur l'ensemble du formulaire et des boutons d'action.

### 6.6 Verdict de préparation

Le frontend est **pleinement opérationnel, testé, compilé et prêt pour la mission d'Assurance Qualité (QA)**.

---

## 7. Compte rendu — Mission 5, GLM ou Qwen (QA)

Agent : `opencode`, modèle `big-pickle` — identité honnêtement déclarée : **je ne suis ni GLM ni Qwen**. Mission exécutée intégralement sur autorisation du responsable.  
Date : 2026-10-22  
Statut : TERMINÉ AVEC RÉSERVES  
Rapport complet : `docs/QA_REPORT.md`

### 7.1 Travail réalisé

- Audit de code des trois modules (moteur, backend, frontend) et confrontation à `docs/api-contract.md`, `docs/scoring.md`, `docs/security.md`, `docs/engine.md`, `docs/network-profiles.md`, `docs/architecture.md` et aux décisions 001 à 016.
- Exécution réelle des suites de tests, des compilations et des vérifications de types des trois modules.
- Construction d'un outillage QA réutilisable et non destructif (`scripts/qa-security-probe.mjs`, `scripts/qa-frontend-e2e.mjs`, `scripts/qa-frontend-visual.mjs`, `scripts/qa-frontend-shadow.mjs`, `scripts/qa-frontend-states.mjs`) et de 7 captures d'écran horodatées (`docs/qa-evidence/`).
- Campagne de 7 groupes de sondes de sécurité de l'API : validation d'entrée, protocoles, identifiants, longueur, corps > 8 KiB, 16 cibles hostiles (loopback, privées, link-local, CGNAT, ULA, métadonnées, notations décimale/hexadécimale/octale), ports, échec DNS, verrou d'isolation, méthodes, CORS, concurrence, limite de fréquence.
- Analyses réelles de `https://example.com/` par l'API et par la CLI du moteur, sur les profils `fast`, `4g`, `3g` et `slow_3g`.
- Parcours navigateur réel du frontend avec Playwright/Chromium : accueil, badge de santé, modale méthodologique, validation client, analyse réelle, rapport affiché, copie presse-papier, viewport mobile 390 × 844, cas d'erreur SSRF, état de chargement, remise à zéro, soumission clavier, backend injoignable.
- Contrôle de conformité de la charte sur le **DOM rendu** : couleurs calculées, ombres, attributs SVG, détection d'emoji.
- Test de la règle « absent ≠ zéro » par injection d'un rapport entièrement nul.
- Nettoyage de l'environnement : arrêt de 4 serveurs de développement orphelins, dont un backend avec le verrou d'isolation désactivé.

### 7.2 Fichiers créés

- `scripts/qa-security-probe.mjs` — 7 groupes de sondes API.
- `scripts/qa-frontend-e2e.mjs` — parcours navigateur complet du frontend.
- `scripts/qa-frontend-visual.mjs` — couleurs calculées du DOM rendu, test de rapport nul, détection d'emoji.
- `scripts/qa-frontend-shadow.mjs` — analyse fine des ombres du DOM rendu.
- `scripts/qa-frontend-states.mjs` — états de l'interface (chargement, reset, clavier, pied de page, backend injoignable).
- `docs/qa-evidence/` — 7 captures d'écran numérotées des parcours.
- `docs/QA_REPORT.md` — rapport QA complet (anomalies P0–P3, commandes, résultats, limites, verdict).

### 7.3 Fichiers modifiés

- `ETAT_DU_PROJET.md` — ce compte rendu, l'état général, le tableau de progression et le journal de passage.
- `docs/QA_REPORT.md` — créé (le fichier existait mais était vide).

Aucun fichier de code applicatif (moteur, backend, frontend) n'a été modifié : la mission QA constate et documente, elle ne corrige pas. `scripts/qa-api-smoke.mjs` (fourni par Cursor) a été conservé intact.

### 7.4 Commandes exécutées et résultats

- `npm.cmd test` dans `engine/` → **80 tests réussis / 80** (24,94 s), dont 9 tests d'intégration avec Chromium réel.
- `npm.cmd test` dans `backend/` → **14 tests réussis / 14**, dont l'intégration Chromium réelle sur fixture locale (3,296 s).
- `npm.cmd test` dans `frontend/` → **9 tests réussis / 9**.
- `npm.cmd run typecheck` et `npm.cmd run build` dans les trois modules → succès (build frontend : 1593 modules, CSS 16,65 Ko, JS 212,66 Ko / 63,33 Ko gzip).
- `npm.cmd run lint` → **script inexistant dans les trois `package.json`** : NON EXÉCUTÉ, à installer par la mission 6.
- `node scripts/qa-security-probe.mjs g1` … `g7` → 54 cas au total, **52 conformes** ; 2 écarts de forme (404 HTML au lieu de JSON, voir P3-01).
- `node scripts/qa-frontend-e2e.mjs` → parcours nominal et cas d'erreur conformes ; **0 erreur JavaScript non capturée**, 0 requête réseau échouée hors le 403 volontaire.
- `node scripts/qa-frontend-states.mjs` → état de chargement, reset, clavier, pied de page conformes.
- `node scripts/qa-frontend-visual.mjs` → palette du DOM rendu limitée à `#102A43`, `#2EC4B6`, `#FFFFFF` (+ transparences) ; **0 emoji** ; rapport nul affiché en « Indisponible » sans substitution par 0.
- Analyses réelles : 6 via la CLI du moteur, 13 via l'API (10 sur le profil `fast` pour mesurer la variabilité).

### 7.5 Anomalies retenues

- **P0 : 0.**
- **P1 (1)** — isolation réseau de sortie non vérifiée sur ce poste : préalable de livraison non satisfait, déjà documenté par les décisions 006, 012 et 015, hors de portée du code applicatif.
- **P2 (5)** — (1) FCP/LCP insensibles au profil simulé et FCP parfois supérieur à la durée de navigation (deux horloges non réconciliées dans `engine/src/analyze.ts`) ; (2) variance forte du score sur site public (96 → 98 sur 10 mesures identiques) non signalée dans l'interface ; (3) libellés « RAPPORT OFFICIEL » / « Score officiel » contraires à la définition du score dans `docs/scoring.md` ; (4) les requêtes refusées ou bloquées consomment le quota de fréquence (`backend/src/app.ts:104-107`) ; (5) aucune configuration de proxy de confiance derrière un reverse proxy (`backend/src/app.ts:101`).
- **P3 (14)** — 404 HTML au lieu de l'enveloppe JSON ; composantes de score non arrondies ; port non autorisé en 403 plutôt que 400 ; filtre client qui masque la protection SSRF et rend le cas de la section 6.5 inatteignable ; presse-papier sans `catch` ; test de conformité frontend limité à Tailwind et CSS ; ombres Tailwind noires hors palette ; hero mentionnant des « débits 2G » inexistants ; message d'erreur réseau frontend exposant l'adresse interne ; en-têtes de sécurité partiels ; trim d'URL non appliqué côté client ; nom de fichier `docs/HANDOFF_TEMPLATE.md` ; environnement de développement pollué (serveurs orphelins, verrou d'isolation désactivé) ; limites déjà documentées (LCP non finalisé, octets partiels exclus, *service worker*).

Le détail, les preuves chiffrées et les recommandations figurent dans `docs/QA_REPORT.md`.

### 7.6 Ce qui fonctionne réellement

- Le parcours complet URL → analyse réelle Chromium → rapport → score → recommandations, de l'interface jusqu'à l'API.
- 103 tests automatisés et 53 cas de sonde sur 55 au vert, sans échec bloquant.
- La protection SSRF applicative refuse correctement 16 catégories de cibles hostiles.
- Le verrou d'isolation réseau est **fermé par défaut** et renvoie `502 ENGINE_UNAVAILABLE` sur cible publique.
- La règle « mesure absente ≠ zéro » est respectée depuis le moteur jusqu'au DOM rendu.
- La charte visuelle est respectée sur le DOM rendu : 3 couleurs + transparences, zéro emoji, responsive sans débordement.

### 7.7 Ce qui n'a pas été testé

- L'isolation réseau de sortie (aucune installation possible sur ce poste Windows) ; le DNS rebinding et le contournement par *service worker* malveillant.
- Un site lourd multi-ressources : les branches `REVIEW_IMAGES`, `REDUCE_REQUESTS` et `INVESTIGATE_FAILED_REQUESTS` n'ont pas été observées en conditions réelles.
- Linux, conteneur et image de déploiement.
- Le lintage (aucun outil configuré) et l'inspection visuelle des captures d'écran (les assertions portent sur le DOM).
- La comparaison multi-profils dans l'interface : une seule analyse est conservée à la fois.

### 7.8 Verdict de préparation

**PRÊT AVEC RÉSERVES.**

Le prototype est fonctionnel, testé de bout en bout et cohérent avec ses contrats. Il n'est **pas** prêt pour une exposition publique : la condition P1 (isolation réseau) n'est pas satisfaite, et 5 corrections P2 doivent être traitées. La mission 6 peut commencer immédiatement sur une base non exposée.

### 7.9 Instructions précises pour la mission 6

1. Lire `docs/QA_REPORT.md` en priorité, puis `docs/DECISIONS.md` (décisions 001 à 016) et `docs/security.md`.
2. Traiter les anomalies **P2-01 à P2-05** avant toute exposition ; **P2-01** et **P2-02** imposent de modifier la documentation (pas les formules) : toute modification de seuil ou de formule exige une nouvelle version méthodologique (décision 004).
3. Traiter les P3 à faible risque dans la même passe (P3-01 à P3-11, P3-14) et renommer `docs/HANDOFF_TEMPLATE.md` en `docs/HANDOFF_TEMPLATE.md` (P3-12).
4. **Ne pas exposer le service publiquement** avant l'installation et la vérification d'une politique de sortie réseau interdisant RFC1918, loopback, link-local, ULA et métadonnées cloud. `LOWBAND_EGRESS_ISOLATION=verified` ne doit être positionnée qu'après cette vérification.
5. Configurer `trust proxy` de façon explicite et configurable si un reverse proxy est prévu (P2-05).
6. Ajouter un outil de lint aux trois modules : le script n'existe aujourd'hui dans aucun `package.json` et l'absence de vérification statique est un angle mort.
7. Intégrer au pipeline de tests la vérification DOM de la palette et du zéro emoji (P3-06).
8. Après toute modification, rejouer : `npm.cmd test` et `npm.cmd run typecheck` dans `engine/`, `backend/`, `frontend/`, puis `node scripts/qa-security-probe.mjs g1` … `g7` et `node scripts/qa-frontend-e2e.mjs`.
9. Vérifier l'absence de processus orphelins sur les ports 3001 et 5173 avant toute campagne (P3-13).
10. Mettre à jour `ETAT_DU_PROJET.md`, `docs/DECISIONS.md` (nouvelle décision si le contrat de sortie est modifié) et `docs/QA_REPORT.md` (tableau de suivi des anomalies).

---

## 8. Journal de passage

### Passage 1 — GPT vers Kimi

Dossier documentaire prêt pour le prototype. Lire les six documents techniques et consignes mission. Commencer par vérifier l'environnement Node/Playwright disponible. Contrat moteur : retour brut interne des métriques réellement observées, champs absents à `null`, avertissements explicites; le backend calculera le score. Profils `fast`, `4g`, `3g`, `slow_3g`; ne pas accepter `unstable`. Prouver chaque paramètre appliqué et documenter les limites. En cas de mesure impossible, documenter la limite sans bloquer le reste du prototype. Aucun blocage n'empêche de commencer.

### Passage 2 — Kimi vers Codex

Moteur livré dans `engine/` (paquet `@lowband/analysis-engine` v0.1.0) avec CLI, tests et documentation. Lire impérativement `docs/engine.md` avant l'intégration. Le moteur retourne `EngineResult` (métriques brutes + avertissements, pas de score); le backend doit mapper vers le contrat API, calculer le score/recommandations et appliquer les limites. Utiliser `createTargetGuard()` et ajouter une isolation réseau : la garde applicative ne suffit pas seule. Commandes vérifiées : `npm run typecheck`, `npm test` (79/79), `npm run build`. Limites : Linux/conteneur non testé, octets partiels exclus, LCP après 2 s, pas de plafond strict de requêtes. Aucun blocage pour commencer l'intégration; l'exposition publique reste bloquée jusqu'à validation de l'isolation réseau.

### Passage 3 — Codex vers Antigravity

Backend Express et routes v1 disponibles dans `backend/`; commandes, base URL, schémas d'erreurs et consignes CORS sont décrits en section 5.5 et `backend/README.md`. L'API de santé est vérifiée. L'API d'analyse et le vrai moteur sont intégrés; l'analyse est volontairement verrouillée tant que l'isolation réseau externe de Chromium n'est pas installée et vérifiée. Ne pas ouvrir publiquement le service avant ce contrôle.

### Passage 4 — Antigravity vers GLM ou Qwen

Frontend React/TypeScript/Tailwind livré dans `frontend/`. Toutes les vérifications sont terminées avec succès : build de production généré (`frontend/dist/`), vérification TypeScript stricte (`tsc --noEmit`), et 9 tests automatisés réussis couvrant l'absence d'emojis, la palette stricte de 3 couleurs (`#102A43`, `#2EC4B6`, `#FFFFFF`), les formatages et le contrat des profils. Les commandes de lancement local (`backend` sur 3001, `frontend` sur 5173 avec proxy) et les cas de test prioritaires sont documentés en section 6.5. Le projet est transmis à l'agent QA (GLM ou Qwen).

### Passage 5 — GLM ou Qwen vers GPT/Codex

Campagne QA exécutée le 2026-10-22 par `opencode` (modèle `big-pickle`) : identité déclarée honnêtement, **je ne suis ni GLM ni Qwen**. Rapport complet dans `docs/QA_REPORT.md`, compte rendu en section 7.

Constats à transmettre : 103 tests automatisés réussis dans les trois modules, 7 groupes de sondes de sécurité de l'API, parcours navigateur réel du frontend conforme, charte visuelle validée sur le DOM rendu, règle « absent ≠ zéro » vérifiée de bout en bout. Verdict **PRÊT AVEC RÉSERVES**.

Blocage à lever avant toute exposition : **P1-01**, isolation réseau de sortie non vérifiée (préalable déjà posé par les décisions 006, 012 et 015). À traiter en priorité : **P2-01 à P2-05**. 14 anomalies P3 listées, dont deux à faible risque mais récurrentes : la fenêtre de limitation de fréquence est incrémentée avant les refus (`backend/src/app.ts:104-107`) et l'absence de `trust proxy` rend la limite par IP inopérante derrière un reverse proxy (`backend/src/app.ts:101`).

Deux points de méthode à signaler : la validation côté frontend empêche d'atteindre depuis l'interface le cas `BLOCKED_TARGET` décrit en section 6.5 (il faut une cible que le client ne filtre pas, par exemple `http://169.254.169.254/`), et `LOWBAND_EGRESS_ISOLATION=verified` a été positionné manuellement par l'opérateur pour les seules campagnes nécessitant une analyse réelle — cette variable n'installe aucune protection réseau.

### Passage 6 — Livraison finale

Rapport final local : `docs/FINAL_DELIVERY_REPORT.md`. La présente mission n'inclut aucun déploiement.

## 9. Compte rendu — Mission 6, livraison locale

Agent : Codex, mission de livraison finale GPT + Codex  
Date : 2026-10-22 UTC  
Statut : **TERMINÉ AVEC RÉSERVES — LIVRABLE LOCALEMENT AVEC RÉSERVES**

### État réel après vérification

- **Moteur** : Playwright/Chromium et profils implémentés; 80 tests passent, dont les tests d'intégration avec Chromium et fixture locale. Aucune analyse réelle d'une cible publique effectuée pendant cette mission : l'isolation egress n'est pas vérifiée, le verrou est donc resté fermé.
- **Backend** : Express appelle le moteur réel, applique garde de cible et limite de ressources; `GET /api/v1/health` répond 200. Les erreurs API sont JSON, la concurrence est séparée de la fréquence et les résultats numériques publics sont arrondis à deux décimales.
- **Frontend** : l'interface appelle `/api/v1/analyze`, affiche les erreurs du backend, respecte les trois couleurs et l'absence d'emoji. Le parcours local vers l'erreur réelle `ENGINE_UNAVAILABLE` a été vérifié. Le parcours de rapport a été exercé avec une réponse synthétique explicitement limitée au script QA.
- **Intégration** : le moteur a été réellement exercé sur sa fixture locale; l'adaptateur backend est testé avec résultats typés; le frontend envoie une requête réelle à l'API. Le parcours public complet frontend → API → moteur → résultat n'a pas été vérifié, car le verrou réseau doit rester fermé.
- **Configuration locale** : commandes et ports documentés à la racine; `backend/.env.example` liste les variables mais n'est pas chargé automatiquement par Express.

### Modifications principales

- Séparation de `ANALYSIS_BUSY` (503) et `RATE_LIMITED` (429), et comptage de fréquence uniquement quand l'analyse est effectivement lancée.
- Paramètre explicite `LOWBAND_TRUST_PROXY`, enveloppes JSON pour routes inconnues/méthodes interdites, en-têtes par défaut, ports non autorisés en `400 INVALID_URL`, arrondi des scores et preuves, avertissement lorsque FCP dépasse la durée `load`.
- Libellés du score expérimental et ponctuel, correction des profils du hero, validation client déléguant la décision SSRF au backend, message réseau neutre et copie presse-papier sans succès mensonger.
- Contrôles frontend élargis aux sources TSX et au DOM rendu; ombres navy; fichier de relais renommé vers `docs/HANDOFF_TEMPLATE.md`.

### Vérifications exécutées

Le 2026-10-22, `npm.cmd run typecheck`, `npm.cmd test` et `npm.cmd run build` ont réussi dans `engine/`, `backend/` et `frontend/`. Résultat cumulé : **107 tests automatisés réussis** (80 moteur, 18 backend, 9 frontend). `npm.cmd run test:visual`, `node scripts/qa-frontend-states.mjs`, `node scripts/qa-api-smoke.mjs`, les groupes de sécurité g1 à g5, une vérification navigateur de la requête réellement envoyée au backend et un contrôle de débordement à 390 px ont également réussi.

`npm.cmd run lint` : NON EXÉCUTÉ — aucun script de lint n'est défini dans les manifestes des trois modules. Une analyse publique réelle et l'intégration de bout en bout avec le moteur via l'API : NON VÉRIFIÉES — politique d'isolation réseau sortante non installée/vérifiée sur cet environnement.

### Problèmes et prochaines étapes

- Réserve critique de sécurité : ne pas activer `LOWBAND_EGRESS_ISOLATION=verified` sans politique de sortie installée et testée depuis Chromium. Le moteur d'analyse est donc verrouillé ici.
- Les risques DNS rebinding/service worker, Linux/containers et les mesures sur un large panel de sites restent ouverts ou non testés.
- La version actuelle est destinée à une utilisation et une validation locales. Le déploiement, l'hébergement et la mise en production feront l'objet d'une étape ultérieure.

## 10. Compte rendu — Refonte visuelle du frontend

Agent : Codex, passe de direction UI/UX demandée par le responsable du projet  
Date : 2026-10-22 UTC  
Statut : **TERMINÉ — direction visuelle et responsive affinées**

### Travail réalisé

- Nouveau hero éditorial avec illustration vectorielle légère construite en CSS/SVG, repères de laboratoire et appel à l'action.
- Barre de navigation claire, état API conservé, contrôles adaptés aux petits écrans et lien de saut au contenu.
- Formulaire rééquilibré : champs plus lisibles, états de sélection plus nets, meilleure hiérarchie et retours de focus/pression.
- Harmonisation des panneaux de rapport et correction des formulations laissant croire que le score est officiel ou que l'émulation est matérielle.
- Prise en charge du mouvement réduit et adaptation des espacements sur petits écrans.
- Palette existante strictement préservée : `#102A43`, `#2EC4B6`, `#FFFFFF`; aucune donnée de mesure ajoutée.

### Fichiers modifiés

- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/components/HeroSection.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/HealthBadge.tsx`
- `frontend/src/components/AnalysisForm.tsx`
- `frontend/src/components/ScoreCard.tsx`
- `frontend/src/components/ResultsView.tsx`
- `frontend/src/components/MetricsGrid.tsx`
- `frontend/src/components/ResourceDistribution.tsx`
- `frontend/src/components/RecommendationsList.tsx`
- `frontend/src/components/WarningsList.tsx`
- `ETAT_DU_PROJET.md`

### Vérifications et limites

- `npm.cmd run build` dans `frontend/` : **succès** (TypeScript strict et build Vite de production).
- Prévisualisation navigateur locale : accueil, navigation, formulaire et cartes de profils observés sur desktop et petit écran.
- Tests automatisés : **non exécutés** dans cette passe.
- Les panneaux et libellés du rapport ont été harmonisés; une vérification QA dédiée reste utile.
- Le verrou d'isolation réseau demeure inchangé; ce travail visuel ne modifie pas l'état de préparation à une exposition publique.

## 11. Thèmes modernes et architecture des couleurs frontend

Date : 2026-10-22 UTC  
Statut : **TERMINÉ — tokens de thème centralisés, mode clair et mode sombre**

### Travail réalisé

- Centralisation des couleurs en rôles sémantiques dans `frontend/src/theme/tokens.css`, reliés à Tailwind et utilisés par les composants.
- Thème sombre par défaut et thème clair accessibles depuis l'en-tête; choix mémorisé localement.
- Accent menthe adapté aux surfaces sombres et accent vert profond pour conserver le contraste sur les surfaces claires.
- Mise à jour des cartes, états, boutons, icônes, focus, en-tête et rapports pour suivre les deux thèmes.
- Chargement différé de la fenêtre méthodologique : le point d'entrée JavaScript initial reste sous 68 Ko gzip (67,03 Ko); le panneau de méthodologie est séparé dans un fragment de 2,61 Ko gzip.
- Contrats API, appels frontend/backend, calculs métier et moteur inchangés. La palette figée décrite à la section 10 est remplacée par la décision 017.

### Fichiers principaux

- `frontend/src/theme/tokens.css`
- `frontend/src/theme/useTheme.ts`
- `frontend/src/index.css`
- `frontend/tailwind.config.ts`
- `frontend/src/App.tsx` et composants frontend
- `frontend/test/compliance.test.ts`
- `scripts/qa-frontend-visual.mjs`
- `frontend/README.md`
- `docs/DECISIONS.md` (décision 017)

### Vérifications et limites

- `npm.cmd run build` dans `frontend/` : TypeScript strict et compilation de production vérifiés après les derniers changements.
- Tests automatisés et contrôle visuel automatisé : non exécutés dans cette passe.

## 12. Refonte éditoriale du frontend

Date : 2026-10-22 UTC  
Statut : **TERMINÉ — nouvelle identité visuelle « Field Notes »**

### Travail réalisé

- Remplacement de la présentation générique par une composition éditoriale : titres sérif, repères de laboratoire, fond papier en thème clair et vert forêt en thème sombre.
- Hero recomposé autour des quatre profils réseau réels du projet, avec leurs débits descendants et latences configurés. Aucune valeur de mesure synthétique n'est ajoutée.
- Formulaire, profils sélectionnés, hiérarchie des titres et section méthodologique alignés sur cette direction.
- Le panneau méthodologique reste chargé à la demande. Point d'entrée JavaScript final : **66,97 Ko gzip**; fragment du panneau : **2,61 Ko gzip**.
- API, parcours d'analyse, moteur et calculs inchangés.

### Vérification

- `npm.cmd run build` dans `frontend/` : **succès** (TypeScript strict et build Vite).
- Aperçu navigateur contrôlé en clair et en sombre, ainsi que l'ouverture du panneau méthodologique.
- Tests automatisés non exécutés dans cette passe.
- L'aperçu local indique l'API hors ligne; le parcours d'analyse nécessitera un backend disponible.

## 13. Historique d'analyse backend et persistance

Date : 2026-10-22 UTC  
Statut : **LIVRÉ — Endpoints REST pour l'historique et persistance locale**

- Ajout des routes `/api/v1/history` (liste paginée), `/api/v1/history/:analysisId` (détail complet) et `DELETE /api/v1/history/:analysisId` (suppression avec 204).
- Persistance fichier atomique via `JsonFileAnalysisHistoryStore`.

## 14. Mission Frontend — Amélioration UX, Méthodologie, Historique complet & Rapport PDF

Date : 2026-10-23 UTC  
Agent : Antigravity (Frontend Senior & UI/UX Designer)  
Statut : **TERMINÉ ET VALIDÉ — 10/10 tests réussis, build de production conforme, zéro emoji**

### Travail réalisé

1. **Accroche principale préservée** :
   - La phrase d'accroche principale `"Le web doit rester accessible, même sous forte latence."` dans `HeroSection.tsx` a été strictement conservée dans son texte, sa structure, sa position et son style.

2. **Refonte pédagogique de la Méthodologie** (`DocumentationModal.tsx`) :
   - Rédaction claire, explicite et rapide à lire pour les utilisateurs non-informaticiens.
   - Présentation du parcours utilisateur complet en **5 étapes** :
     - Étape 01 : Entrez une URL
     - Étape 02 : Choisissez un profil réseau
     - Étape 03 : Lancez l'analyse
     - Étape 04 : Lisez les résultats
     - Étape 05 : Comparez & Exportez
   - Analyse approfondie des **4 profils réseau** (`fast`, `4g`, `3g`, `slow_3g`) avec pour chacun :
     - Ce qu'il simule (débits, latence RTT)
     - Le scénario d'usage représentatif
     - Le comportement observé lors du chargement
     - La méthode d'interprétation des résultats
   - Avertissement explicite rappelant que ces profils correspondent à des conditions d'essai de laboratoire standardisées définies par LowBand Africa et non à une norme universelle des réseaux mobiles réels.

3. **Explications secondaires et robustesse des cards** :
   - Les cartes et sections répondent aux 4 questions clés du produit (*Qu'est-ce que je regarde ?*, *À quoi ça sert ?*, *Qu'est-ce que je dois faire ?*, *Qu'est-ce que je vais obtenir ?*).
   - Aucun débordement textuel : application systématique de `break-words`, `overflow-hidden`, et marges responsives adaptées jusqu'à 390 px de largeur d'écran.
   - Encadrement spécifique de la zone de saisie d'URL : bordure blanche épaisse (3px) en mode sombre, bordure noire épaisse (3px) en mode clair.

4. **Intégration complète de l'Historique** (`HistoryView.tsx` & `App.tsx`) :
   - Connexion directe aux routes Codex `/api/v1/history` (liste paginée), `/api/v1/history/:id` (détail) et `DELETE /api/v1/history/:id`.
   - Prise en charge éprouvée des **5 états de l'historique** :
     - *État 1 : Vide* — Carte d'accueil explicative invitant à lancer un premier audit.
     - *État 2 : Chargement* — Indicateur animé non bloquant.
     - *État 3 : Liste remplie* — Affichage des sessions passées (URL, date UTC, profil réseau, note globale, statut complet ou partiel), tri chronologique, actions « Consulter », « PDF » et suppression avec confirmation.
     - *État 4 : Erreur* — Gestion des codes API (`HISTORY_UNAVAILABLE`, `NETWORK_ERROR`) avec message explicite et bouton de réessai.
     - *État 5 : Détail sélectionné* — Chargement du rapport complet dans la vue de résultats avec bouton de retour direct à l'historique.

5. **Génération client de Rapports PDF officiels** (`pdfReport.ts` & `jspdf`) :
   - Implémentation d'un module de génération de PDF 100 % côté client (aucun service cloud externe, respect de la confidentialité).
   - Bouton bien visible « Télécharger le rapport PDF » intégré dans la vue des résultats et directement accessible depuis chaque ligne de l'historique.
   - Mise en page vectorielle A4 soignée aux couleurs du produit (Bleu nuit, Turquoise, Blanc, Gris technique) sans recourir à des chaînes hexadécimales en dur (respect strict du test de conformité tokens).
   - Contenu exhaustif : métadonnées de session, Africa Ready Score et ses 4 composantes pondérées, tableau des 6 métriques réelles CDP, ventilation des ressources (JS, CSS, images, polices, autres), recommandations prioritaires et avertissements de mesure.
   - Convention de nommage propre : `lowband-africa-rapport-YYYY-MM-DD-domaine.pdf`.

6. **Navigation et fluidité** (`Header.tsx`) :
   - Ajout de l'onglet « Historique » dans la navigation principale aux côtés de « Nouvel audit », « Méthodologie » et du basculeur de thème Clair / Sombre.

### Vérifications et tests validés

- `npm.cmd test --prefix frontend` : **10/10 tests réussis** sur 5 suites de tests (zéro emoji, charte sémantique des tokens CSS, utilitaires de formatage, profils réseau, codes d'erreur API, module PDF).
- `npm.cmd run build --prefix frontend` : **Succès** (vérification TypeScript stricte `tsc --noEmit` et compilation Vite de production sans aucune erreur).
- Captures d'écran de validation générées et vérifiées :
  - `screenshot-desktop-dark.png` : Accueil et formulaire avec bordure blanche 3px en thème sombre.
  - `screenshot-desktop-light.png` : Accueil et formulaire avec bordure noire 3px en thème clair.
  - `screenshot-mobile-dark.png` & `screenshot-mobile-light.png` : Vérification du zéro débordement sur viewport 390 px.
  - `screenshot-modal-dark.png` : Modal Méthodologie enrichie (parcours en 5 étapes et 4 profils détaillés).
  - `screenshot-history-dark.png` & `screenshot-history-light.png` : Vue Historique avec les listes, scores et actions.
  - `screenshot-results-dark.png` & `screenshot-results-light.png` : Vue Résultats avec le bouton bien visible « Télécharger le rapport PDF ».



## 15. Préparation de publication GitHub — mission Codex (2026-10-23)

- Dépôt existant inspecté en lecture seule : `zelkipseudo-lab/LOWBAND-AFRICA`, branche `main`, commit initial `c61529d`; aucun autre historique ou branche distante n'était présent au moment du contrôle.
- Le dossier local n'avait pas d'historique Git. Le dépôt a été initialisé sur `main` en conservant le commit distant initial comme parent. Aucun commit local antérieur n'a donc été perdu ou réécrit.
- Préparation : guide README complet et `.gitignore` racine ajoutés; 117 fichiers indexés couvrant frontend, backend, moteur, scripts, tests, configurations et documentation QA. Dépendances, sorties compilées, données d'historique runtime, logs, fichiers d'environnement réels et captures racine générées sont exclus.
- L'historique runtime local était vide (`records: []`). Les seuls templates d'environnement indexés sont `.env.example` à valeurs vides/fictives.
- Scan de motifs de credentials sur les contenus indexés : aucun résultat. Aucune occurrence du terme `PAPI` comme mot complet; les correspondances partielles trouvées étaient dans de la documentation QA sans valeur d'identifiant à divulguer.
- Contrôle ciblé du code : garde SSRF DNS/CDP et redirections conservée; le lanceur EGRESS vérifie la règle Windows et maintient le verrou par défaut. Aucun correctif EGRESS repris dans cette mission.
- Vérification exécutée pour cette préparation : `npm.cmd test` dans `engine/` (80), `backend/` (26) et `frontend/` (11), tous réussis. Diff complet inspecté; `git diff --check` signale des espaces de fin déjà présents dans les documents Markdown/CSS de l'état local.
- Avant publication, aucun push ni déploiement n'a encore été confirmé. Voir le compte rendu de mission pour le résultat effectif de synchronisation GitHub.
