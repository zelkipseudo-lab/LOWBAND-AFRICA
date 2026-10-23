# Journal des décisions techniques — LowBand Africa

## Décision 001 — Stack de référence

Date : 2026-10-22  
Statut : adoptée

Frontend React + Vite + TypeScript + Tailwind; backend Node.js + TypeScript + Express; analyse Playwright + Chromium. Choix de référence déjà posé par le document produit et adapté au parcours local. Aucune dépendance payante obligatoire.

## Décision 002 — Priorité au parcours P0

Statut : adoptée

URL → analyse réelle → rapport avec données disponibles → score explicable → recommandations. Pas de compte, historique, base de données ni comparaison multi-profil avant validation du parcours.

## Décision 003 — Mesures et absence de données

Statut : adoptée

Les mesures viennent du navigateur réellement exécuté. Champs indisponibles à `null`; un absent n'est jamais zéro. Avertissements exposent les limites. Le moteur collecte, le backend calcule le score.

## Décision 004 — Africa Ready Score v1.0

Date : 2026-10-22  
Statut : adoptée pour le prototype, à calibrer empiriquement

Poids : performance 30 %, données 30 %, ressources 20 %, résilience observée 20 %. Les sous-scores, seuils, minimum de complétude, labels et règles de recommandation sont spécifiés dans `scoring.md`. Toute modification entraîne une nouvelle version méthodologique.

## Décision 005 — Profils réseau v1

Date : 2026-10-22  
Statut : adoptée sous réserve de validation par Kimi

`fast`, `4g`, `3g`, `slow_3g` ont des paramètres fixes documentés. `unstable` est exclu de l'API jusqu'à implémentation reproductible. Les paramètres sont des simulations de labo et doivent être prouvés dans l'environnement disponible.

## Décision 006 — SSRF et déploiement

Statut : exigence obligatoire

Validation de chaque destination/redirection côté serveur, ports 80/443 par défaut, filtrage d'adresses publiques et défense réseau contre les plages internes/métadonnées. Le DNS applicatif seul ne suffit pas à garantir la destination réelle de Chromium. Ne pas exposer publiquement sans isolation réseau vérifiée.

## Décision 007 — Analyse synchrone du prototype

Date : 2026-10-22  
Statut : adoptée sous réserve de limite d'hébergement

Un POST attend le rapport, timeout total cible 45 s, concurrence initiale 1 configurable. Pas de stockage ni endpoint de progression. Si le runtime choisi ne tient pas la connexion, proposer une architecture asynchrone dans une décision ultérieure.

## Décision 008 — Passage moteur/backend

Date : 2026-10-22  
Statut : adoptée

Le moteur est un module interne appelé avec une URL déjà validée et un profil choisi côté serveur. Il retourne mesures brutes/avertissements; pas de serveur public, pas de score, pas de responsabilité SSRF implicite. Contrats dans `architecture.md` et `api-contract.md`.

## Décision 009 — Moteur livré comme paquet local `engine/`

Date : 2026-10-22  
Statut : adoptée  
Contexte : l'architecture cible place le moteur dans `backend/src/analysis/engine/`, mais aucun backend n'existe encore. La mission Kimi doit livrer un prototype testable sans empiéter sur la mission Codex.  
Options examinées : créer immédiatement le squelette backend (hors mission) ; créer un paquet autonome `engine/` ; attendre le backend.  
Décision : paquet TypeScript privé `@lowband/analysis-engine` dans `engine/`, exportant `analyze()`, les profils, les erreurs et la garde de cible. Le backend l'importera via une dépendance `file:../engine` après `npm run build`, ou copiera les sources dans `backend/src/analysis/engine/` s'il préfère un module interne.  
Justification : isole la mission analyse, évite de préempter Codex, permet des tests réels indépendants, et respecte l'architecture « module interne, pas d'API publique ».  
Conséquences : `engine/dist/` doit être construit avant l'installation côté backend ; le contrat interne est documenté dans `docs/engine.md`.  
Fichiers affectés : `engine/`, `docs/engine.md`, `ETAT_DU_PROJET.md`.  
Responsable : Kimi (mission exécutée par l'agent de remplacement).

## Décision 010 — Sémantique des mesures du moteur

Date : 2026-10-22  
Statut : adoptée  
Contexte : le contrat API exige des mesures réelles, des `null` explicites et une taille de transfert non trompeuse.  
Options examinées : utiliser `PerformanceResourceTiming.transferSize` (souvent nul ou incomplet selon cache/CORS) ; utiliser les événements CDP `Network.*` ; estimer depuis les en-têtes Content-Length.  
Décision :

- `navigationMs` = `loadEventEnd` de Navigation Timing ; repli sur l'horloge murale jusqu'à `load` avec avertissement ; `null` si la navigation expire.
- FCP/LCP = PerformanceObserver injecté avant navigation, avec repli `paint` ; `null` si absent.
- `requestCount` = nombre de `requestId` CDP distincts ; une chaîne de redirections compte une fois.
- `failedRequests` = requêtes terminées par `Network.loadingFailed` ou statut HTTP final >= 400, sans double comptage.
- `transferBytes` = somme des `encodedDataLength` de `Network.loadingFinished` ; octets réseau encodés observés, hors surcoût TLS/HTTP2 et hors corps décodé. Les octets partiels des requêtes échouées/non terminées sont exclus et signalés. `null` si aucune réponse terminée.
- `resources` = répartition des mêmes octets par type CDP ; `Document`, XHR, Fetch, Media et autres types vont dans `otherBytes`.

Justification : mesures observées et reproductibles, pas d'estimation inventée ; les limites restent visibles dans `warnings`.  
Conséquences : les valeurs `null` ne sont jamais converties en zéro ; le backend doit propager les avertissements.  
Fichiers affectés : `engine/src/analyze.ts`, `engine/src/network/collector.ts`, `docs/engine.md`.  
Responsable : Kimi.

## Décision 011 — Profils réseau v1 validés via CDP

Date : 2026-10-22  
Statut : adoptée (validation ponctuelle, à recalibrer)  
Contexte : la décision 005 exigeait une validation dans l'environnement Playwright/Chromium.  
Options examinées : Playwright natif (pas de throttle réseau intégré) ; CDP `Network.emulateNetworkConditions` ; proxy externe.  
Décision : émulation via CDP avant navigation, débits convertis en octets/seconde, latence en millisecondes, perte non simulée (`packetLossPercent: null`). Les quatre profils ont été exercés lors d'analyses réelles ; la fixture locale de 143 914 octets a produit 252 ms (`fast`), 347 ms (`4g`), 1 279 ms (`3g`) et 3 948 ms (`slow_3g`) de navigation. `unstable` reste rejeté.  
Justification : mécanisme supporté par Chromium 156, effet observable et conservation du profil dans le résultat.  
Conséquences : ne pas promettre une perte de paquets ni une représentation d'un réseau réel ; un seul passage n'est pas une comparaison statistique.  
Fichiers affectés : `engine/src/profiles.ts`, `engine/src/analyze.ts`, `docs/network-profiles.md`.  
Responsable : Kimi.

## Décision 012 — Garde SSRF applicative et limite d'isolation

Date : 2026-10-22  
Statut : adoptée comme défense en profondeur, insuffisante seule  
Contexte : le moteur navigue vers une URL utilisateur ; Chromium peut contacter des adresses internes et suivre des redirections. Une validation de l'URL initiale seule est insuffisante.  
Options examinées : expression régulière (rejetée) ; validation DNS initiale seule (insuffisante) ; validation DNS + interception Playwright `context.route` (ne voit pas correctement les redirections dans la version testée) ; validation DNS + CDP `Fetch` par requête (retenue) ; isolation réseau seule (nécessaire en complément).  
Décision : `createTargetGuard()` parse l'URL, refuse les protocoles/ports/identifiants/hôtes locaux, résout A/AAAA avec `dns.lookup` et classifie chaque adresse avec `ipaddr.js` ; le moteur active CDP `Fetch` et revalide chaque requête et redirection avant `continueRequest`, en échouant sur `BlockedByClient`. Cache DNS positif de 5 s.  
Justification : interception au niveau réseau de Chromium, redirections couvertes, rejet avant connexion applicative.  
Conséquences : ce contrôle n'est pas une isolation réseau complète. Le cache de 5 s laisse une fenêtre de rebinding, Chromium peut résoudre différemment de Node, et les service workers peuvent contourner une partie de l'interception. Codex doit ajouter une politique de sortie interdisant les plages internes/métadonnées avant toute exposition publique.  
Fichiers affectés : `engine/src/security/target-guard.ts`, `engine/src/analyze.ts`, `docs/security.md`, `docs/engine.md`.  
Responsable : Kimi pour la garde applicative ; Codex pour l'isolation réseau.

## Décision 013 — Environnement de collecte et délais

Date : 2026-10-22  
Statut : adoptée  
Contexte : il faut des conditions reproductibles et des limites cohérentes avec `docs/security.md` et la décision 007.  
Décision : contexte Chromium neuf par analyse, fermé dans `finally` ; cache HTTP désactivé par défaut ; viewport 1366 × 768, DPR 1 ; headless par défaut ; téléchargements refusés ; HTTPS non contourné. Délais par défaut : total 45 s, navigation 30 s, attente post-load 2 s. En cas d'expiration de navigation uniquement, retour d'un résultat partiel avec avertissement ; en cas d'expiration totale, `ANALYSIS_TIMEOUT`. Le moteur lance un navigateur par appel.  
Justification : état frais et limites prévisibles, sans prétendre reproduire un appareil mobile.  
Conséquences : le backend doit fixer une échéance inférieure à son propre timeout (40 s recommandé), limiter la concurrence et installer Chromium dans l'image de déploiement.  
Fichiers affectés : `engine/src/analyze.ts`, `docs/engine.md`, `ETAT_DU_PROJET.md`.  
Responsable : Kimi.

## Décision 014 — Base de tests et versions de référence

Date : 2026-10-22  
Statut : adoptée pour le prototype  
Contexte : les résultats doivent être reproductibles et les limites d'environnement explicites.  
Décision : base de référence Node.js 24.13.1, npm 11.19.0, Playwright 1.64.1, Chromium 156.0.8078.4, TypeScript 5.9.3, Vitest 5.0.5, Windows. `npm run typecheck`, 79 tests et `npm run build` réussissent à cette date. Linux/conteneur reste non testé.  
Justification : trace honnête de ce qui a réellement été exécuté.  
Conséquences : toute intégration Linux doit refaire les tests, notamment le lancement Chromium et `--no-sandbox`.  
Fichiers affectés : `engine/package.json`, `engine/package-lock.json`, `ETAT_DU_PROJET.md`, `docs/engine.md`.  
Responsable : Kimi ; QA doit reproduire.

### Décision 015 — Backend v1 et garde d'isolation réseau

Date : 2026-10-22  
Statut : adoptée pour la mission backend, sous réserve de vérification de l'environnement de déploiement

Contexte : le contrat demande un navigateur serveur ouvrant des URL contrôlées par l'utilisateur. La garde DNS/CDP du moteur ne prévient pas seule le DNS rebinding ni les différences de résolution Chromium/Node; le poste Windows local ne fournit pas de politique egress vérifiable.

Décision : créer `backend/` avec Express, conserver `engine/` comme paquet `file:../engine`, calculer score et recommandations côté API, limiter concurrence à 1 et fréquence à 10 analyses par client/10 minutes. L'exécution du moteur est verrouillée par défaut; `LOWBAND_EGRESS_ISOLATION=verified` ne peut être défini qu'après mise en place et vérification d'un filtrage réseau externe. Le signal d'annulation est propagé au moteur à la fermeture client.

Justification : le backend reste concret et intégrable sans prétendre qu'une validation DNS est une barrière réseau complète; l'API reste non exploitable en analyse tant que la condition P0 de sécurité n'est pas vérifiée.

Conséquences : Antigravity peut intégrer le schéma API et vérifier la santé locale. Pour une analyse réelle de bout en bout, le responsable doit exécuter le backend dans un environnement dont la politique de sortie est effectivement contrôlée et vérifiée. La variable seule ne prouve rien.

Fichiers affectés : `backend/`, `engine/src/analyze.ts`, `engine/src/types.ts`, `engine/src/errors.ts`, `docs/security.md`, `docs/engine.md`, `ETAT_DU_PROJET.md`.

### Décision 016 — Frontend v1 : Architecture React, contrainte 3 couleurs et zéro emoji

Date : 2026-10-22  
Statut : adoptée  
Contexte : La mission 4 exige une interface utilisateur professionnelle, moderne, légère et responsive connectée au backend v1 existant, avec une charte graphique strictement restreinte à 3 couleurs et l'interdiction absolue de tout emoji.  
Options examinées :  
- Bibliothèque de composants lourde (rejetée pour respecter l'empreinte réseau minimale).  
- Couleurs conventionnelles d'alerte rouge/orange (rejetées conformément à la contrainte de conception stricte).  
- Stack React 18 + Vite + TypeScript + Tailwind CSS avec configuration verrouillée aux 3 teintes `#102A43`, `#2EC4B6`, `#FFFFFF` et icônes vectorielles Lucide.  
Décision : Implémenter le frontend dans `frontend/` avec proxy Vite `/api` vers `http://127.0.0.1:3001`, gestion déterministe des types API v1, affichage explicite des valeurs `null` (jamais de faux 0), gestion des 11 codes d'erreur API, et suite de tests automatisés validant la palette et l'absence totale d'emojis.  
Justification : Respecte scrupuleusement l'esprit LowBand (bundle gzippé < 68 Ko, temps de chargement ultra-court), l'accessibilité typographique et le contrat technique du backend.  
Conséquences : L'interface est directement testable localement et prête pour l'audit QA.  
Fichiers affectés : `frontend/`, `ETAT_DU_PROJET.md`.  
Responsable : Antigravity Frontend.

### Décision 017 — Frontend : thèmes sémantiques clair et sombre

Date : 2026-10-22  
Statut : adoptée, remplace uniquement la contrainte de palette de la décision 016

Contexte : le responsable demande une direction de couleur plus moderne et une architecture frontend extensible, sans modifier les échanges avec l'API ni le fonctionnement backend.

Options examinées : conserver la palette tricolore avec quelques retouches; ajouter une nouvelle palette globale; centraliser les couleurs dans des rôles et fournir deux thèmes cohérents.

Décision : centraliser les couleurs dans `frontend/src/theme/tokens.css`, utiliser les noms de rôles dans Tailwind, adopter le thème sombre comme défaut et proposer une bascule vers le thème clair mémorisée dans le stockage local. Garder React, Vite, TypeScript, Tailwind, les composants et contrats API v1. Les règles d'absence d'emoji et d'intégrité des mesures restent actives.

Justification : les contrastes et les états d'interface peuvent être adaptés ensemble pour chaque thème, sans introduire de couleurs dispersées ou modifier les fonctionnalités métier.

Conséquences : mettre à jour les vérifications de palette pour valider les deux thèmes et les tokens sémantiques. Les parcours d'analyse et la réponse backend ne changent pas.

Fichiers affectés : `frontend/src/theme/`, `frontend/src/`, `frontend/tailwind.config.ts`, `frontend/test/compliance.test.ts`, `scripts/qa-frontend-visual.mjs`, `frontend/README.md`.

### Décision 018 — Frontend : direction éditoriale « Field Notes »

Date : 2026-10-22  
Statut : adoptée, remplace la palette et les traitements de surface de la décision 017; conserve son architecture à deux thèmes

Contexte : les premiers ajustements de thème ne donnaient pas assez d'identité à l'interface. Le besoin est de distinguer le produit des tableaux de bord génériques et de présenter les paramètres réseau sans inventer de données.

Décision : adopter une direction éditoriale inspirée de notes de terrain, avec un fond papier chaud en thème clair, un vert forêt profond en thème sombre, un accent citron, des titres sérif et des valeurs réseau réellement configurées dans la page d'accueil. Recomposer les repères méthodologiques en quatre dimensions lisibles. Garder les rôles de couleur, la bascule de thème, les parcours et les contrats API.

Justification : la typographie et la composition apportent une identité sans images externes, tandis que les profils affichés sont directement lus dans la configuration partagée.

Conséquences : l'interface et le thème sont modifiés; le premier chargement reste léger grâce au chargement différé de la documentation.

Fichiers affectés : `frontend/src/theme/tokens.css`, `frontend/src/index.css`, `frontend/src/components/HeroSection.tsx`, `frontend/src/components/EmptyStatePreview.tsx`, `frontend/src/components/HealthBadge.tsx`, `frontend/src/App.tsx`.

### Décision 019 — Historique via interface de persistance

Date : 2026-10-23  
Statut : adoptée

Contexte : le produit doit conserver les rapports retournés par l'analyse, sans lier l'orchestration à un moteur de stockage précis. Aucun stockage n'existait dans le backend.  
Options examinées : base de données externe (non configurée dans le projet); stockage navigateur (source de vérité inappropriée); adaptateur fichier avec contrat remplaçable.  
Décision : introduire `AnalysisHistoryStore` côté backend et un adaptateur JSON configurable par `LOWBAND_HISTORY_FILE`. L'écriture est atomique et les changements sérialisés dans une instance. `POST /analyze` persiste le rapport réel avant de répondre; en cas d'erreur de stockage il répond `503 HISTORY_UNAVAILABLE`. Ajout d'une liste paginée (limit/offset), détail et suppression.  
Justification : persistance immédiate sans service additionnel, interface découplée et migration ultérieure vers une base partagée sans réécrire routes/orchestration.  
Conséquences : le JSON convient à une instance unique avec disque persistant, pas à plusieurs processus/réplicas ni à un environnement sans volume persistant. En l'absence d'authentification, les entrées sont communes à l'instance. `partial` est attribué uniquement au marqueur de navigation partielle actuellement émis par le moteur; les autres mesures nulles restent des avertissements dans un statut `completed`. Les erreurs moteur ne sont pas conservées.  
Fichiers affectés : `backend/src/history.ts`, `backend/src/app.ts`, tests backend, `docs/api-contract.md`, `docs/architecture.md`, `ETAT_DU_PROJET.md`.  
Responsable : Codex.

### Décision 020 — Vérification de la politique EGRESS avant le démarrage local

Date : 2026-10-23  
Statut : adoptée

Contexte : le garde backend utilise `LOWBAND_EGRESS_ISOLATION` pour refuser l'analyse si l'isolation n'a pas été confirmée. Le message frontend liait ce refus à `ENGINE_UNAVAILABLE` et demandait au visiteur de faire installer un pare-feu sur son poste. Le script Windows vérifiait Chromium, la garde loopback applicative et un site public, mais ne vérifiait pas que la règle EGRESS Windows était toujours activée et liée au binaire Playwright Chromium courant.  
Décision : garder la fermeture par défaut; distinguer l'erreur `EGRESS_POLICY_UNVERIFIED` (503) d'un lancement réel du moteur impossible (`ENGINE_UNAVAILABLE`, 502). Le prévol de démarrage Windows vérifie maintenant l'état du pare-feu, la règle de blocage, le chemin Chromium courant et les plages réseau partagées avec le script d'installation. Les messages frontend indiquent que le visiteur n'a rien à installer.  
Justification : corriger la cause opérationnelle et la confusion de l'interface sans désactiver la défense SSRF ou le filtrage réseau. Les futurs visiteurs utilisent le backend hébergé; l'isolation reste à configurer dans son environnement d'exécution.  
Conséquences : une nouvelle règle API est documentée. Un poste Windows développeur doit installer la règle une fois en administrateur; le prévol est automatique à chaque lancement. Les autres runtimes doivent appliquer et vérifier leur politique réseau avant de déclarer la variable.  
Fichiers affectés : `backend/src/app.ts`, tests backend, `frontend/src/components/ErrorDisplay.tsx`, `frontend/src/types/api.ts`, `frontend/src/api/client.ts`, scripts EGRESS, documentation API/sécurité.

## Format pour les décisions suivantes

### Décision NNN — Titre

Date :  
Statut : proposée / adoptée / rejetée / remplacée  
Contexte :  
Options examinées :  
Décision :  
Justification :  
Conséquences :  
Fichiers affectés :  
Responsable :
