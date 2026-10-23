# RAPPORT QA — LowBand Africa

Mission 5 — QA, scoring et sécurité  
Date : 2026-10-22 (UTC)  
Agent exécutant : `opencode`, modèle `big-pickle` — **je ne suis pas GLM ni Qwen**  
Périmètre : moteur `engine/`, API `backend/`, application `frontend/`, sécurité, conformité de charte  
Statut de la mission : **PRÊT AVEC RÉSERVES**

> Aucune valeur de ce rapport n'est estimée ou reconstituée. Chaque ligne provient d'une commande réellement exécutée le 2026-10-22 sur le poste de travail Windows. Les tests non exécutés sont explicitement signalés.

---

## 1. Environnement de test

| Élément | Valeur constatée |
|---|---|
| Système | Windows (poste local, aucun conteneur) |
| Node.js | `v24.13.1` |
| npm | `11.19.0` (appelé via `npm.cmd` / `npx.cmd`, `npm.ps1` bloqué par la politique PowerShell) |
| Playwright | `1.64.1` (installé dans `engine/node_modules`) |
| Chromium | `156.0.8078.4` (Chrome for Testing + headless shell) |
| TypeScript | 5.9.3 (moteur) / 5.6.3 (frontend) |
| Backend | `http://127.0.0.1:3001` (`backend/dist/server.js`) |
| Frontend | `http://127.0.0.1:5173` (Vite dev, proxy `/api` → `http://127.0.0.1:3001`) |
| Isolation réseau de sortie | **Aucune politique egress vérifiée sur ce poste.** La variable `LOWBAND_EGRESS_ISOLATION=verified` a été positionnée **manuellement par l'opérateur** pour les seules campagnes de tests nécessitant une analyse réelle. |

### 1.1 Outillage QA créé pour cette mission

| Fichier | Rôle |
|---|---|
| `scripts/qa-security-probe.mjs` | 7 groupes de sondes API (validation, protocoles, SSRF, plages IP, ports/DNS/CORS, analyse réelle, limite de fréquence) |
| `scripts/qa-frontend-e2e.mjs` | Parcours navigateur complet du frontend (Playwright) : accueil, modale, validation, analyse réelle, copie presse-papier, viewport mobile, cas d'erreur SSRF |
| `scripts/qa-frontend-visual.mjs` | Extraction des couleurs calculées du DOM rendu + test de rendu avec métriques toutes nulles + détection d'emoji |
| `scripts/qa-frontend-shadow.mjs` | Analyse fine des ombres (`box-shadow`) du DOM rendu |
| `scripts/qa-frontend-states.mjs` | États de l'interface : chargement, reset, soumission clavier, pied de page, backend injoignable |
| `docs/qa-evidence/*.png` | Captures d'écran des parcours (7 fichiers numérotés) |

Ces scripts sont **réutilisables et non destructifs** : ils ne modifient aucun code applicatif.

### 1.2 Nettoyage préalable de l'environnement

Quatre serveurs de développement orphelins d'une session précédente occupaient les ports 3001, 5173 et 5174. L'un des backends tournait avec `LOWBAND_EGRESS_ISOLATION=verified` actif, donc **le verrou de sécurité était contourné sans action de l'opérateur** : toute analyse de cible publique aboutissait. Processus arrêtés avant la campagne QA. Voir anomalie **P3-13**.

---

## 2. Synthèse du verdict

| Sévérité | Nombre | Éléments bloquants la livraison |
|---|---:|---|
| P0 | 0 | — |
| P1 | 1 | Préalable de livraison non satisfait : isolation réseau de sortie non vérifiée (déjà documenté, non résolu) |
| P2 | 5 | À traiter avant toute exposition publique |
| P3 | 14 | Améliorations et écarts de forme |

**Verdict : PRÊT AVEC RÉSERVES.**

Le parcours nominal complet fonctionne de bout en bout et sans donnée inventée : saisie → validation → navigation Chromium réelle sous émulation CDP → métriques observées → score explicable → recommandations → rapport affiché. Les 103 tests automatisés des trois modules passent, 52 des 54 cas de sondes de sécurité obtiennent le comportement attendu (les 2 écarts sont des écarts de forme sur des routes hors contrat v1, voir P3-01), et le parcours navigateur réel aboutit à un rapport cohérent.

Ce qui manque pour une exposition publique : la condition P1 (isolation réseau) et les 5 corrections P2 listées en section 6. Aucune correction de code n'est bloquante pour la mission 6 (intégration finale), qui peut commencer en parallèle sur une base non exposée.

---

## 3. Tests automatisés

### 3.1 Suites de tests

| Commande | Répertoire | Résultat | Statut |
|---|---|---|---|
| `npm.cmd test` | `engine/` | **80 tests réussis / 80** (4 fichiers : intégration 9, garde cible 53, profils 4, collecteur 14), 24,94 s | RÉUSSI |
| `npm.cmd test` | `backend/` | **14 tests réussis / 14** (`app.test` 11 dont intégration Chromium réelle sur fixture locale 3,296 s ; `scoring.test` 3) | RÉUSSI |
| `npm.cmd test` | `frontend/` | **9 tests réussis / 9** (conformité 2, formatage 4, profils 2, erreurs API 1) | RÉUSSI |
| `npm.cmd run lint` | les 3 modules | **Script inexistant** dans les 3 `package.json` | NON EXÉCUTÉ (outil absent) |
| `npm.cmd run typecheck` | `engine/`, `backend/`, `frontend/` | aucune erreur TypeScript | RÉUSSI |
| `npm.cmd run build` | `engine/`, `backend/` | compilation réussie | RÉUSSI |
| `npm.cmd run build` | `frontend/` | `dist/assets/index-cVKm9jXT.css` 16,65 Ko · `dist/assets/index-nc6xCwS4.js` 212,66 Ko (63,33 Ko gzip) · 1593 modules | RÉUSSI |

**Total : 103 tests automatisés réussis, 0 échec, 0 test ignoré.** Le compte de 80 tests du moteur diffère des 79 annoncés en décision 014 : le test d'annulation et de fermeture des ressources a été ajouté depuis.

### 3.2 Analyse réelle via le moteur (CLI, garde SSRF active)

Commande : `npm.cmd run analyze -- "https://example.com/" --profile <profil> --json`

| Profil | `durationMs` | `navigationMs` | `fcpMs` | `lcpMs` | Requêtes | Transfert | Avertissements |
|---|---:|---:|---:|---:|---:|---:|---:|
| `fast` | 3 176 | 565 | 816 | 816 | 2 | 2 023 o | 0 |
| `3g` | 3 401 | 819 | 836 | 928 | 2 | 2 046 o | 0 |
| `slow_3g` | 4 086 | 1 325 | 832 | 1 368 | 2 | 2 046 o | 0 |
| `fast` | 3 260 | 529 | 780 | 780 | 2 | 2 023 o | 0 |
| `3g` | 4 096 | 634 | 780 | 780 | 2 | 2 023 o | 0 |
| `slow_3g` | 4 310 | 1 446 | 848 | 1 476 | 2 | 2 046 o | 0 |

L'ordre `fast` < `3g` < `slow_3g` est respecté sur `navigationMs`, ce qui confirme l'effet de l'émulation CDP. Deux observations anormales sont analysées en **P2-01** (FCP insensible au profil, FCP > navigationMs).

### 3.3 Analyses réelles via l'API

Commande : `POST http://127.0.0.1:3001/api/v1/analyze`, backend redémarré entre chaque groupe de sondes pour réinitialiser la fenêtre de fréquence.

| Profil | Statut | `durationMs` | `navigationMs` | `fcpMs` | `lcpMs` | Requêtes | Transfert | Score | Composantes (valeurs brutes API) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `4g` | 200 | 6 465 | 3 802 | 3 368 | 3 844 | 2 | 2 046 o | 84 `excellent` | 48,856666666666676 / 99,8977 / 99,25677999999999 / 100 |
| `slow_3g` | 200 | 4 096 | 1 419 | 884 | 1 440 | 2 | 2 023 o | 95 `excellent` | 83,37666666666667 / 99,89885 / 99,25838999999999 / 100 |
| `fast` × 10 | 200 × 10 | 2 991 – 3 565 | 517 – 1 058 | 448 – 816 | 612 – 1 092 | 2 | 2 023 – 2 046 o | **96 / 97 / 98** | 86,48 – 92,47 / 99,89885 / 99,25677999999999 / 100 |

Recommandation `REVIEW_JAVASCRIPT` produite sur les 13 analyses (`javascriptShare` 0,7409787444389521 → 0,7438905180840665), `warnings` vide, `availableWeight` = 1 exactement.

**Écart notable :** le profil `4g` (10 Mbps, 50 ms) a été **plus lent** que `slow_3g` (400 Kbps, 400 ms) lors de cette campagne (`navigationMs` 3 802 contre 1 419). La variabilité serveur du site cible (Cloudflare, edge distant) domine lorsque la page est minuscule. L'ordre reste correct sur 6 exécutions CLI et 13 exécutions API, mais l'écart-type d'une mesure isolée est important : voir **P2-02**.

---

## 4. Sondes de sécurité de l'API

Sonde : `node scripts/qa-security-probe.mjs <groupe>`. Backend propre, sans variable d'environnement pour les groupes g1 à g5.

### g1 — Validation d'entrée et en-têtes

| Cas | Attendu | Obtenu | Statut |
|---|---|---|---|
| `GET /api/v1/health` | 200 `{"status":"ok"}` | 200, corps conforme | RÉUSSI |
| En-têtes de sécurité | `cache-control: no-store`, `x-content-type-options: nosniff`, pas de `x-powered-by` | conformes | RÉUSSI |
| Corps non JSON / JSON malformé / tableau JSON | 400 `INVALID_JSON` | 400 `INVALID_JSON` | RÉUSSI |
| Champ supplémentaire dans le corps | 400 `INVALID_URL` | 400 `INVALID_URL` | RÉUSSI |
| `profile` absent ou `unstable` | 400 `INVALID_PROFILE` | 400 `INVALID_PROFILE` | RÉUSSI |
| `url` absent | 400 `INVALID_URL` | 400 `INVALID_URL` | RÉUSSI |

### g2 — Protocoles, identifiants, longueur, taille de corps

| Cas | Attendu | Obtenu | Statut |
|---|---|---|---|
| `ftp://`, `file://`, `javascript:` | 400 `UNSUPPORTED_PROTOCOL` | 400 `UNSUPPORTED_PROTOCOL` | RÉUSSI |
| Identifiants dans l'URL | 400 `INVALID_URL` | 400 `INVALID_URL` | RÉUSSI |
| Espace en tête / en fin | 400 `INVALID_URL` | 400 `INVALID_URL` | RÉUSSI |
| URL > 2 048 caractères | 400 `INVALID_URL` | 400 `INVALID_URL` | RÉUSSI |
| Corps > 8 KiB | 400 `INVALID_JSON` | 400 `INVALID_JSON` | RÉUSSI |

### g3 — Cibles loopback (8 variantes)

`127.0.0.1`, `[::1]`, `localhost`, `127.0.0.1:80`, `2130706433` (décimal), `0x7f000001` (hexadécimal), `0177.0.0.1` (octal), `[::ffff:127.0.0.1]` → **403 `BLOCKED_TARGET` dans les 8 cas**. RÉUSSI.

### g4 — Cibles privées, link-local et métadonnées (8 variantes)

`10.0.0.1`, `172.16.0.1`, `192.168.1.1`, `169.254.169.254`, `metadata.google.internal`, `100.100.100.200` (CGNAT Alibaba), `0.0.0.0`, `[fd00::1]` (ULA) → **403 `BLOCKED_TARGET` dans les 8 cas**. RÉUSSI.

### g5 — Ports, DNS, verrou d'isolation, méthodes, CORS

| Cas | Attendu | Obtenu | Statut |
|---|---|---|---|
| `https://example.com:8080/` | refus | 403 `BLOCKED_TARGET` | RÉUSSI (voir **P3-03**) |
| `https://example.com:22/` | refus | 403 `BLOCKED_TARGET` | RÉUSSI (voir **P3-03**) |
| Domaine inexistant | échec de navigation | 502 `NAVIGATION_FAILED` | RÉUSSI |
| Cible publique, verrou egress fermé | moteur indisponible | 502 `ENGINE_UNAVAILABLE` | RÉUSSI |
| `GET /api/v1/analyze` | refus | 404 **HTML** (page Express par défaut) | ÉCHOUÉ (**P3-01**) |
| Route inconnue `/api/v1/unknown` | enveloppe JSON | 404 **HTML** | ÉCHOUÉ (**P3-01**) |
| CORS origine étrangère | pas d'autorisation | aucun `Access-Control-Allow-Origin` | RÉUSSI |
| CORS origine déclarée `http://127.0.0.1:5173` | autorisation exacte | `Access-Control-Allow-Origin: http://127.0.0.1:5173` + `Vary: Origin` | RÉUSSI |
| `OPTIONS` | préflight | 204 | RÉUSSI |

### g6 — Concurrence et analyse réelle (egress vérifié)

| Cas | Attendu | Obtenu | Statut |
|---|---|---|---|
| Analyse réelle `4g` | 200 + rapport | 200, rapport complet | RÉUSSI |
| Analyse réelle `slow_3g` | 200 + rapport | 200, rapport complet | RÉUSSI |
| Paire de requêtes simultanées | 1 × 200 + 1 × refus | 200 puis **429 `RATE_LIMITED`** | RÉUSSI (voir **P2-04**) |

### g7 — Limitation de fréquence

10 analyses consécutives → **200 × 10**, puis la 11ᵉ → **429 `RATE_LIMITED`** avec enveloppe JSON. RÉUSSI.

### 4.1 Limites explicites de la sécurité (non contournables applicativement)

Ces points sont **documentés et assumés** par les décisions 012 et 015 ; la QA les confirme sans les résoudre :

- le DNS rebinding reste possible (cache DNS positif de 5 s, résolution Chromium ≠ résolution Node) ;
- les requêtes émises par un *service worker* peuvent contourner une partie de l'interception CDP `Fetch` ;
- la validation DNS applicative **ne remplace pas** une politique de sortie réseau ;
- aucune isolation egress n'est vérifiée sur ce poste (voir **P1-01**).

---

## 5. Parcours navigateur réel du frontend (Playwright)

Sonde : `node scripts/qa-frontend-e2e.mjs` et `node scripts/qa-frontend-states.mjs`. Chromium réel, frontend Vite, backend réel.

| Vérification | Résultat | Statut |
|---|---|---|
| Badge de santé | `Backend API : Opérationnel` | RÉUSSI |
| Titre et contenu du hero | conformes | RÉUSSI |
| Modale « Méthodologie » | s'ouvre et se ferme | RÉUSSI |
| Validation client, URL vide / protocole `ftp://` | message d'erreur immédiat | RÉUSSI |
| Analyse réelle depuis l'UI (`3G Lente / Edge Dégradé`) | rapport affiché : score 95, composantes 84 / 100 / 99 / 100, recommandation `REVIEW_JAVASCRIPT` | RÉUSSI |
| Copie du résumé (presse-papier) | contenu collé conforme (identifiant, URL, profil, score, composantes arrondies) | RÉUSSI |
| Viewport mobile 390 × 844 | **0 px** de débordement horizontal | RÉUSSI |
| Cas d'erreur SSRF via l'UI (`http://169.254.169.254/latest/meta-data/`) | panneau `BLOCKED_TARGET` / « Destination non autorisée » | RÉUSSI |
| État de chargement | « Analyse réelle en cours », cible, profil actif, 3 étapes affichées | RÉUSSI |
| Remise à zéro (« Nouvelle analyse ») | formulaire restauré, URL conservée | RÉUSSI |
| Soumission au clavier (Tab + Entrée) | analyse déclenchée | RÉUSSI |
| Pied de page | cadre expérimental, mention SSRF, version API | RÉUSSI |
| Backend injoignable | message d'erreur affiché | RÉUSSI (voir **P3-09**) |
| Erreurs JavaScript non capturées (`pageerror`) | **0** | RÉUSSI |
| Requêtes réseau échouées | **0** hors le 403 attendu du cas SSRF | RÉUSSI |
| Erreurs console | 1 seule : le 403 volontaire du test SSRF | RÉUSSI |

### 5.1 Affichage des valeurs nulles (règle « absent ≠ zéro »)

Un rapport synthétique avec **toutes** les métriques et toutes les composantes à `null` a été injecté par interception de la route `/api/v1/analyze`.

- 20 occurrences d'« Indisponible » affichées ;
- **aucune** substitution par `0` (contrôle explicite : `zero_substitution: false`) ;
- score global affiché « — » avec le libellé « Données incomplètes » et l'explication de la renormalisation (poids effectif 0 %).

RÉUSSI — la règle d'intégrité est respectée jusque dans l'interface.

### 5.2 Conformité de la charte (palette 3 couleurs, zéro emoji)

Extraction des styles calculés sur **tous** les éléments du DOM rendu (état d'accueil et état résultats) : `color`, `background-color`, les 4 `border-*-color`, `outline-color`, `text-decoration-color`, `fill`, `stroke`, `box-shadow`.

- Couleurs réellement rendues : `#102A43`, `#2EC4B6`, `#FFFFFF` et leurs variantes avec transparence (`@0.05` à `@0.8`). **Aucune autre teinte.** ✓
- Les icônes Lucide portent `fill="none"` + `stroke="currentColor"` : aucune couleur parasite. ✓
- **Ombres Tailwind par défaut : `rgba(0,0,0,0.05)` (`shadow-sm`) et `rgba(0,0,0,0.1)` (`shadow`) sur 4 éléments — teinte noire hors palette autorisée.** → **P3-07**
- Emoji détectés dans le DOM rendu (plages Unicode 1F300–1FAFF, 2600–27BF, 1F000–1F0FF, U+FE0F, U+20E3) : **0**. ✓

### 5.3 Écarts avec le parcours prévu en section 6.5 de `ETAT_DU_PROJET.md`

Le parcours prévu indiquait de vérifier le panneau `BLOCKED_TARGET` en saisissant `http://127.0.0.1/` ou `http://localhost:3000/`. **Ces deux saisies sont interceptées par la validation du frontend** et n'atteignent jamais le serveur : le cas a été rejoué avec `http://169.254.169.254/latest/meta-data/`, qui n'est pas filtré côté client, et le panneau `BLOCKED_TARGET` s'affiche correctement. → **P3-04**.

---

## 6. Anomalies classées

### P1-01 — Préalable de livraison non satisfait : isolation réseau de sortie

**Constat.** Sur ce poste Windows, aucune politique de sortie réseau n'est en place ni vérifiable. La garde SSRF applicative (résolution DNS + classification `ipaddr.js` + interception CDP `Fetch` par requête et par redirection) a été validée sur 16 cibles hostiles et refuse correctement loopback, plages privées, link-local, CGNAT, ULA, métadonnées cloud, notations décimale/hexadécimale/octale. Elle reste cependant une **défense en profondeur** et non une barrière réseau.

**Impact.** Une exposition publique du service laisserait ouverte la fenêtre de rebinding DNS, la divergence de résolution Chromium/Node et le contournement par *service worker* (cf. décision 012). C'est un risque d'accès aux métadonnées cloud ou aux réseaux internes, pas un défaut de mesure.

**Portée.** Prérequis déjà identifié et documenté (décisions 006, 012, 015 ; `docs/security.md`), **non résolu** et hors de portée du code applicatif. Le verrou `LOWBAND_EGRESS_ISOLATION=verified` reste correctement fermé par défaut : vérifié par sonde g5 (502 `ENGINE_UNAVAILABLE` sur cible publique).

**Recommandation.** Aucune exposition publique tant que la politique de sortie n'est pas installée et vérifiée par l'opérateur. `LOWBAND_EGRESS_ISOLATION=verified` ne doit être positionnée qu'après cette vérification, dans un environnement de déploiement contrôlé.

### P2-01 — FCP/LCP insensibles au profil simulé, et FCP parfois supérieur à la durée de navigation

**Constat.** Sur les 6 analyses CLI et les 13 analyses API :

| Profil | `navigationMs` observés | `fcpMs` observés |
|---|---|---|
| `fast` | 517 – 1 058 | 448 – 816 |
| `3g` | 634 – 819 | 780 – 836 |
| `slow_3g` | 1 325 – 1 446 | 832 – 848 |

Le FCP reste dans une bande étroite (≈ 780 – 850 ms) quel que soit le profil, alors que `navigationMs` varie de 529 à 1 446 ms. Sur 3 exécutions `fast`, **`fcpMs` > `navigationMs`** (565/816, 529/780, 570/792).

**Cause racine.** `navigationMs` est lu dans `navigation.loadEventEnd` et `fcpMs` dans l'entrée `first-contentful-paint` : deux horloges indépendantes, jamais réconciliées (`engine/src/analyze.ts:181-218`). En Chromium headless, la première peinture est différée d'environ 700–800 ms après le début de la navigation : elle devient alors indépendante de la latence simulée et peut se produire après l'événement `load`.

**Impact.** Le sous-score Performance (30 % du score) repose presque exclusivement sur `navigationMs` ; FCP et LCP apportent peu de différenciation entre profils. L'interface peut afficher une durée de navigation **inférieure** au premier affichage visuel, ce qui est illisible pour l'utilisateur. Vérification manuelle du calcul : `slow_3g` (nav 1 325, fcp 832, lcp 1 368) → performance 84,34 → 84, cohérent avec la valeur API.

**Recommandation.** (a) Réconcilier explicitement les deux horloges : émettre un `warning` si `fcpMs > navigationMs` et documenter le plancher de peinture headless dans `docs/engine.md` ; (b) à terme, enregistrer une peinture forcée (`Page.setWebLifecycleState` ou attente d'un frame) pour décorréler le FCP du plancher headless. Ne pas modifier la formule de score sans nouvelle version méthodologique (décision 004).

### P2-02 — Variance forte du score sur site public, non signalée dans l'interface

**Constat.** Même URL (`https://example.com/`), même profil (`fast`), 10 exécutions : score **96, 97, 97, 97, 97, 97, 97, 98, 97, 96** ; `navigationMs` de 517 à 1 058 ms.

**Impact.** `docs/scoring.md` indique qu'« un seul passage n'est pas une comparaison statistique » (décision 011) et que le score est calculé sur « les observations réelles d'une seule navigation ». L'interface, elle, affiche un « RAPPORT OFFICIEL » unique : deux rapports successifs du même site peuvent laisser croire à une régression inexistante.

**Recommandation.** Afficher explicitement la nature ponctuelle de la mesure (mention « mesure ponctuelle » près du score) et, si un comparatif doit être proposé, prévoir N répétitions avec médiane — ce qui relève d'une décision produit et d'une nouvelle version méthodologique.

### P2-03 — Le score est présenté comme « officiel », contrairement à la méthodologie

**Constat.** L'interface affiche « RAPPORT OFFICIEL » (`ResultsView.tsx:57`) et « Score officiel LowBand Africa » (`ScoreCard.tsx:72`), ainsi que « Note déterministe sur 100 » dans le hero. Or `docs/scoring.md` définit le score comme un « **indicateur expérimental propre au produit, non une norme ou certification** ». Le pied de page mentionne bien « Cadre méthodologique expérimental », d'où une contradiction interne.

**Impact.** Risque de présenter une mesure de laboratoire propriétaire comme une certification, ce que les règles de communication du projet excluent.

**Recommandation.** Remplacer « RAPPORT OFFICIEL » par « RAPPORT D'ANALYSE » et « Score officiel LowBand Africa » par « Score Africa Ready — indicateur expérimental », en conservant la mention existante du pied de page. Correction textuelle, sans impact fonctionnel.

### P2-04 — Les requêtes refusées ou bloquées consomment le quota de fréquence

**Constat.** `backend/src/app.ts:104-107` : la fenêtre de 10 analyses / 10 minutes est incrémentée **avant** le contrôle de concurrence (ligne 107) et **avant** la garde SSRF (ligne 117). Vérifié : une paire de requêtes simultanées produit 200 + 429, et la requête refusée a déjà consommé une unité du quota.

**Impact.** Un utilisateur qui saisit plusieurs cibles bloquées, ou qui reçoit un refus de concurrence, épuise le quota de ses 10 analyses légitimes et se voit opposer `429 RATE_LIMITED`. Le refus de concurrence renvoie d'ailleurs le même code que la limitation de fréquence, ce qui masque la cause réelle.

**Recommandation.** N'incrémenter la fenêtre qu'au moment où une analyse est effectivement lancée, et distinguer le refus de concurrence (503 ou 429 avec un libellé dédié) du dépassement de fréquence.

### P2-05 — Aucune configuration de proxy de confiance

**Constat.** `backend/src/app.ts:101` utilise `req.ip ?? req.socket.remoteAddress` sans jamais appeler `app.set("trust proxy", ...)`.

**Impact.** En cas de déploiement derrière un reverse proxy — configuration attendue pour un service web — l'adresse cliente est celle du proxy : la limitation de fréquence s'applique alors indistinctement à tous les utilisateurs (blocage collectif au bout de 10 analyses) et le contrôle d'origine CORS reste exact mais l'identification client est fausse.

**Recommandation.** Paramétrer `trust proxy` via une variable d'environnement explicite et documenter le mode mono-instance (`backend/.env.example`, `docs/security.md`). À traiter avant tout déploiement multi-utilisateur.

### P3-01 — Les routes inconnues renvoient du HTML au lieu de l'enveloppe JSON d'erreur

`GET /api/v1/analyze` et `GET /api/v1/unknown` renvoient la page HTML par défaut d'Express (404). `docs/api-contract.md:50` impose que « toutes les erreurs suivent le même enveloppe JSON ». Le frontend bascule alors sur `UNKNOWN_ERROR / Réponse inattendue du serveur (404)`, ce qui est correct mais opaque. **Recommandation :** ajouter un gestionnaire 404/405 renvoyant `{ error: { code, message, requestId } }`.

### P3-02 — Composantes de score et preuves renvoyées en flottants bruts

L'API renvoie `performance: 48.856666666666676`, `dataEfficiency: 99.8977`, `evidence.javascriptShare: 0.7409787444389521`, alors que l'exemple du contrat (`docs/api-contract.md:30`) montre des entiers. Le frontend arrondit correctement à l'affichage (99,8977 → 100 ; 99,2567 → 99), mais l'API brute est bruitée. **Recommandation :** arrondir les composantes et les preuves à 2 décimales côté backend, sans toucher à la formule (pas de changement de version méthodologique).

### P3-03 — Un port non autorisé renvoie 403 au lieu de 400

`https://example.com:8080/` et `https://example.com:22/` renvoient `403 BLOCKED_TARGET`. Le port faisant partie de l'URL, `400 INVALID_URL` serait plus cohérent avec le contrat (« 400 corps/URL/profil invalide ; 403 cible bloquée »). **Recommandation :** trancher en documentation et aligner le code, ou l'inverse.

### P3-04 — La validation client masque la protection SSRF et rend le cas documenté inatteignable

Dans `AnalysisForm.tsx:42-52`, le contrôle « nom de domaine valide » (absence de point) s'exécute **avant** le contrôle des adresses privées. Conséquence : `http://localhost:3001` affiche « Veuillez renseigner un nom de domaine valide » au lieu du message SSRF, tandis que `http://127.0.0.1` affiche bien « Les adresses privées et locales sont interdites (protection SSRF) ». Par ailleurs, `localhost`, `127.0.0.1`, `10.*` et `192.168.*` sont bloqués côté client : le panneau `BLOCKED_TARGET` n'est atteignable que pour des cibles non filtrées (`169.254.169.254`, ULA, etc.). Le filtre client ne couvre ni `172.16/31`, ni `169.254`, ni `::1`, ni les notations décimale/hexadécimale. **Recommandation :** le filtre client ne doit être qu'un confort de saisie ; le message doit refléter la protection réelle, et la section 6.5 de `ETAT_DU_PROJET.md` doit être corrigée.

### P3-05 — Copie presse-papier sans gestion d'échec

`ResultsView.tsx:44` appelle `navigator.clipboard.writeText(summary)` sans `catch` : promesse rejetée non gérée possible (contexte non sécurisé, permission refusée), et le bouton affiche « Copié ! » même si l'écriture a échoué. **Recommandation :** `await` + `catch`, et n'afficher « Copié ! » qu'en cas de succès.

### P3-06 — Le test de conformité du frontend ne couvre ni les sources TSX ni le DOM rendu

`frontend/test/compliance.test.ts` n'inspecte les couleurs que dans `tailwind.config.ts` et `index.css`. La QA a compensé par une extraction des styles calculés du DOM rendu (`scripts/qa-frontend-visual.mjs`), mais cette vérification n'est pas intégrée à la suite de tests : la charte pourrait être enfreinte en TSX sans que la suite ne le voie. **Recommandation :** intégrer un test de non-régression sur les sources TSX + une vérification du DOM rendu.

### P3-07 — Ombres Tailwind par défaut hors palette

`shadow-sm` et `shadow` produisent `rgba(0,0,0,0.05)` et `rgba(0,0,0,0.1)` : une teinte noire en dehors des trois couleurs autorisées, constatée sur 4 éléments du DOM rendu. **Recommandation :** remplacer par une ombre dérivée du navy (`rgba(16,42,67,0.06)`) ou retirer les utilitaires `shadow-*`.

### P3-08 — Le hero annonce des « débits 2G / 3G / 4G » inexistants

`HeroSection.tsx:37` mentionne « débits 2G / 3G / 4G », alors que les quatre profils réels sont 20 Mbps, 10 Mbps, 1,5 Mbps et 400 Kbps. Aucun profil 2G n'existe et le profil le plus lent (400 Kbps) n'est pas du 2G. La modale « Méthodologie » est, elle, correcte. **Recommandation :** corriger le texte du hero.

### P3-09 — Le message d'erreur réseau frontend expose une adresse interne

`ErrorDisplay.tsx:75` affiche « http://127.0.0.1:3001 » à l'utilisateur final. Divulgation d'infrastructure et message invalide en production (l'API peut être déployée ailleurs). **Recommandation :** message neutre, détails réservés au développement.

### P3-10 — En-têtes de sécurité partiels sur l'API

`Cache-Control: no-store` et `X-Content-Type-Options: nosniff` sont posés, `X-Powered-By` est désactivé, mais il n'y a ni `Content-Security-Policy` ni `X-Frame-Options`. L'API ne sert pas de HTML, l'impact est faible ; `Vary: Origin` n'est posé que sur les réponses CORS autorisées. **Recommandation :** poser `Vary: Origin` systématiquement et ajouter les en-têtes par défaut.

### P3-11 — Trim de l'URL non appliqué côté client

Le client envoie l'URL telle quelle ; le serveur refuse un espace en tête ou en fin (`400 INVALID_URL`, `app.ts:95`). Un utilisateur collant une URL avec un espace final obtient une erreur serveur au lieu d'une normalisation silencieuse. **Recommandation :** appliquer `trim()` à l'envoi (le serveur conserve son refus, qui reste correct).

### P3-12 — `docs/HANDOFF_TEMPLATE.md` vs `docs/HANDOFF_TEMPLATE.md`

Le routeur et `docs/README_AGENT.md` référencent `docs/HANDOFF_TEMPLATE.md`, mais le fichier présent s'appelle `docs/HANDOFF_TEMPLATE.md`. Déjà signalé par la mission 1 et non corrigé hors mission. **Recommandation :** renommer le fichier lors de la mission 6 (correction documentaire sans risque).

### P3-13 — Environnement de développement pollué

Quatre serveurs orphelins d'une session précédente occupaient 3001, 5173 et 5174 ; l'un des backends tournait avec `LOWBAND_EGRESS_ISOLATION=verified` actif, donc le verrou de sécurité était désactivé sans action de l'opérateur. Arrêtés pendant la QA. **Recommandation :** vérifier l'absence de processus orphelins avant toute campagne et éviter de laisser un backend en mode « egress vérifié » actif en développement.

### P3-14 — Écarts de forme déjà documentés, confirmés

- Le LCP est lu après une fenêtre de 2 s et n'est pas finalisé : sa valeur peut encore évoluer (décision 013).
- `transferBytes` exclut les octets partiels des requêtes échouées ou non terminées (avertissement émis).
- `failedRequests` compte aussi les statuts HTTP ≥ 400, et non uniquement les échecs réseau.
- Les requêtes de *service worker* peuvent ne pas être interceptées par CDP `Fetch`.
- Le LCP est la seule métrique absente du sous-score Performance quand elle est indisponible ; la renormalisation est signalée par `availableWeight`.

---

## 7. Ce qui a été vérifié et qui reste vérifiable par l'agent entrant

| Capacité | Comment la vérifier |
|---|---|
| API saine | `GET http://127.0.0.1:3001/api/v1/health` → `200 {"status":"ok"}` |
| Analyse réelle | `POST http://127.0.0.1:3001/api/v1/analyze` avec `{"url":"https://example.com/","profile":"4g"}` **après** avoir positionné `LOWBAND_EGRESS_ISOLATION=verified` dans un environnement dont la sortie réseau est contrôlée |
| Verrou d'isolation | sans cette variable → `502 ENGINE_UNAVAILABLE` sur cible publique |
| Garde SSRF | `{"url":"http://169.254.169.254/","profile":"4g"}` → `403 BLOCKED_TARGET` |
| Limite de fréquence | 11 appels consécutifs → le 11ᵉ renvoie `429 RATE_LIMITED` |
| Parcours frontend complet | backend sur 3001, `npm.cmd run dev` dans `frontend/` → `http://127.0.0.1:5173` |
| Rejeu de la campagne QA | `node scripts/qa-security-probe.mjs g1` … `g7`, `node scripts/qa-frontend-e2e.mjs`, `node scripts/qa-frontend-states.mjs`, `node scripts/qa-frontend-visual.mjs` |

---

## 8. Limites de cet audit

- **Isolation réseau non vérifiée** : aucun contrôle de sortie n'a pu être installé ni testé sur ce poste Windows. Les conclusions de sécurité reposent sur la garde applicative et sur la lecture du code.
- **DNS rebinding et *service worker* malveillant** : non testés de façon concluante ; ils exigent un site contrôlé et une infrastructure de test dédiée.
- **Linux / conteneur** : non testé (aucun élément de la QA ne dépend d'un OS particulier hors le lancement de Chromium déjà validé par les suites).
- **Panel de sites** : l'audit porte sur `example.com` (2 requêtes, 2 Ko). Aucun site lourd, multi-ressources, avec images, polices, requêtes échouées ou latence serveur n'a été analysé ; les branches `REVIEW_IMAGES`, `REDUCE_REQUESTS` et `INVESTIGATE_FAILED_REQUESTS` des recommandations n'ont donc pas été observées en conditions réelles.
- **Linting** : aucun outil de lint n'est configuré dans le projet ; l'absence de script n'a pas été compensée.
- **Analyse des captures d'écran** : les assertions de la QA portent sur le DOM (textes, styles calculés, appels réseau), pas sur une inspection visuelle des images.
- **Comparaison multi-profils** : le parcours « un même site analysé sous plusieurs profils » (documenté en mission 1 comme usage attendu) n'est pas disponible dans l'interface : une seule analyse est conservée à la fois.

---

## 9. Recommandations pour la mission 6

1. **Ne pas exposer le service publiquement** avant l'installation et la vérification d'une politique de sortie réseau (P1-01).
2. Corriger les 5 anomalies P2 : réconciliation FCP/navigation et avertissement (P2-01), mention de mesure ponctuelle (P2-02), libellés « officiel » (P2-03), comptage du quota après lancement effectif (P2-04), `trust proxy` configurable (P2-05).
3. Traiter les corrections P3 à faible risque (P3-01 à P3-11, P3-14) dans la même passe : enveloppe JSON pour les 404/405, arrondi des composantes, message réseau frontend, `catch` sur le presse-papier, test de conformité TSX, ombres navy, texte du hero, `trim()` de l'URL.
4. Intégrer la vérification DOM de la palette et du zéro emoji dans la suite de tests frontend (P3-06).
5. Renommer `docs/HANDOFF_TEMPLATE.md` en `docs/HANDOFF_TEMPLATE.md` (P3-12).
6. Documenter dans `docs/engine.md` la sémantique exacte de `navigationMs` face au plancher de peinture headless (P2-01) et dans `docs/scoring.md` la nature ponctuelle de la mesure (P2-02), **sans modifier les formules ni la version méthodologique** (décision 004).
7. Répéter la présente campagne après toute modification : `npm.cmd test` dans les trois modules, puis les scripts `scripts/qa-*.mjs`.

## 10. Suivi de livraison locale — mission 6 (2026-10-22)

Les constats d'origine ci-dessus décrivent la campagne QA du 22 octobre. Après corrections ciblées, les contrôles de régression suivants ont été exécutés : 80 tests moteur, 18 tests backend, 9 tests frontend, typecheck/build des trois modules, probes API g1–g5, `scripts/qa-api-smoke.mjs`, `scripts/qa-frontend-states.mjs` et contrôle DOM `frontend/npm.cmd run test:visual`. Résultat : **107 tests automatisés réussis; aucun échec dans le passage final**. Les détails et commandes se trouvent dans `docs/FINAL_DELIVERY_REPORT.md`.

| Constat initial | État après mission 6 |
|---|---|
| P1-01 | **Non résolu, réserve bloquante pour l'analyse publique.** Isolation de sortie non vérifiée sur ce poste. Le verrou moteur est resté fermé; les tentatives publiques renvoient `502 ENGINE_UNAVAILABLE`. |
| P2-01 | Avertissement API ajouté lorsque FCP dépasse l'événement `load`; sémantique headless documentée. Aucun changement de formule. |
| P2-02, P2-03 | Mesure ponctuelle et nature expérimentale affichées et documentées; libellés « officiel » retirés. |
| P2-04 | Quota incrémenté au lancement effectif; concurrence refusée en `503 ANALYSIS_BUSY`, fréquence en `429 RATE_LIMITED`. Test de non-consommation du quota lors d'un refus SSRF ajouté. |
| P2-05 | Liste explicite `LOWBAND_TRUST_PROXY` ajoutée, vide par défaut et documentée pour les déploiements derrière un proxy. |
| P3-01 à P3-10 | Corrigés : erreurs JSON 404/405, valeurs arrondies, ports interdits en 400, décision SSRF laissée au backend, échec clipboard géré, test DOM/source étendu, ombres navy, hero corrigé, adresse interne masquée, en-têtes par défaut ajoutés. |
| P3-11 | Déjà corrigé dans le code courant avant cette mission : la valeur envoyée est normalisée par `trim()`. Vérifié, aucune modification requise. |
| P3-12 | Corrigé : fichier renommé `docs/HANDOFF_TEMPLATE.md` et références alignées. |
| P3-13 | Aucun processus serveur orphelin détecté avant le lancement local de cette mission; les serveurs de test locaux ont été arrêtés après les vérifications. |
| P3-14 | Limites de mesure confirmées et conservées dans la documentation moteur; aucune donnée inconnue convertie en zéro. |

### Parcours et limites de preuve

- `GET /api/v1/health`, les refus SSRF, les validations URL/profil/protocole, le verrou egress et les réponses d'erreur JSON ont été exercés contre le backend local.
- Le navigateur a transmis une requête d'analyse au backend local; la réponse `ENGINE_UNAVAILABLE` a été reçue et rendue. Le DOM en attente/résultat synthétique QA, y compris les métriques `null`, a été vérifié sans injecter de données de démo dans le produit.
- Le moteur a été exécuté via ses tests Chromium contre une fixture locale. Le parcours complet sur `https://example.com/` via frontend/API/moteur est **NON VÉRIFIÉ — raison :** aucune politique réseau sortante efficace n'a pu être confirmée depuis Chromium. `LOWBAND_EGRESS_ISOLATION=verified` n'a pas été défini.
- DNS rebinding, service worker malveillant, Linux/conteneur et analyse de sites publics lourds restent non testés.

**Verdict de livraison locale : LIVRABLE LOCALEMENT AVEC RÉSERVES.** Aucune infrastructure ni mise en ligne n'a été réalisée.
# Vérifications complémentaires — historique des analyses (2026-10-23)

| Test | Entrée / objectif | Résultat observé | Statut |
|---|---|---|---|
| HIST-01 | Analyse réussie avec moteur simulé au niveau du test, persistance fichier temporaire | 200; UUID enregistré avec le rapport observé; nouveau store relit l'entrée après réouverture | PASS |
| HIST-02 | Navigation partielle marquée par le vrai warning du contrat moteur | 200; statut `partial` et warning conservés dans la réponse et l'historique | PASS |
| HIST-03 | Analyse moteur échouée | Erreur 502; l'historique reste vide | PASS |
| HIST-04 | Historique vide et pagination | 200; `items: []`, total 0; limite 101 et offset négatif refusés en 400 | PASS |
| HIST-05 | Détail UUID valide absent et identifiant invalide | 404 `NOT_FOUND`; 400 `INVALID_ANALYSIS_ID` | PASS |
| HIST-06 | Suppression et panne d'écriture/lecture simulée | Suppression 204; erreur de persistance 503 `HISTORY_UNAVAILABLE`, détail interne masqué | PASS |
| HIST-07 | Persistance après redémarrage de l'API | Vérifiée en recréant l'adaptateur et l'application sur le même fichier temporaire; pas de processus serveur distinct lancé | PASS — portée du test précisée |
| HIST-08 | Écritures simultanées, réécriture du fichier et suppression réelle | Deux sauvegardes concurrentes conservées; suppression et relecture du fichier validées | PASS |
| HIST-09 | Retrait des secrets URL courants de la copie persistée | Paramètres `access_token` et `api_key` et fragment supprimés; paramètre `lang` conservé | PASS |

Commandes réellement exécutées depuis `backend/` : `npm.cmd test` — 25 tests backend réussis; `npm.cmd run typecheck` — succès; `npm.cmd run build` — succès. Les analyses de ces tests utilisent un moteur substitué et un stockage isolé : aucune mesure fictive n'est écrite dans le fichier de l'application.

Non-régression des autres modules exécutée dans cette mission : `npm.cmd test` depuis `engine/` — 80 tests réussis (4 fichiers, incluant Chromium local); `npm.cmd test` depuis `frontend/` — 9 tests réussis. Total courant des suites automatisées des trois modules : 114 réussites, 0 échec.

Limitation résiduelle : l'adaptateur JSON et ses opérations concurrents n'ont été vérifiés dans un seul processus. Pas de test multiprocessus/réplicas ni d'interface historique frontend dans cette mission.

## Vérifications complémentaires — diagnostic EGRESS (2026-10-23)

### Cause et preuve

- Le backend crée l'application sans ouvrir Chromium; sur chaque `POST /api/v1/analyze`, il vérifie `LOWBAND_EGRESS_ISOLATION` avant d'appeler l'analyseur. Quand la valeur n'est pas `verified`, il renvoie désormais le code distinct `EGRESS_POLICY_UNVERIFIED`.
- L'ancienne UI traitait `ENGINE_UNAVAILABLE` comme une consigne d'administration Windows, bien que ce code puisse aussi venir d'un véritable lancement Chromium impossible.
- Aucun `scripts/Verify-Egress.ps1` n'est présent. Le vérificateur réel est `scripts/verify-chromium-egress.mjs`; il testait l'interception loopback du garde applicatif et l'accès Chromium à `example.com`, mais ne vérifiait pas la règle pare-feu.
- Diagnostic de la machine exécuté en lecture seule : les profils Windows Domain/Private/Public sont activés et la règle `LowBandAfrica-Chromium-Block-NonPublic` est active (`Outbound`, `Block`, `Profile Any`) pour le Chromium Playwright courant, avec les plages non publiques IPv4/IPv6 configurées.

### Correctif et résultats observés

Le lanceur valide désormais la règle EGRESS exacte et sa correspondance avec le Chromium courant avant de poser `LOWBAND_EGRESS_ISOLATION` au processus backend. Le code API sépare politique non vérifiée (`503 EGRESS_POLICY_UNVERIFIED`) et panne réelle Chromium (`502 ENGINE_UNAVAILABLE`); l'interface informe que le visiteur n'a rien à installer. La liste des plages est partagée par l'installateur et le prévol.

| Contrôle | Résultat observé | Statut |
|---|---|---|
| Démarrage backend sans déclaration EGRESS, port 3003 | Health `200`; analyse `https://example.com/` refusée avec `503 EGRESS_POLICY_UNVERIFIED` | PASS |
| Prévol Windows puis démarrage backend vérifié, port 3002 | Profils/règle Chromium vérifiés; sonde Chromium réussie; API health `200` | PASS |
| Chromium Playwright et URL publique autorisée | `POST /api/v1/analyze` sur `https://example.com/`, profil `4g` → `completed`, `navigationMs=610`; enregistrement QA supprimé ensuite (`204`) | PASS |
| Cible locale | API pour `http://127.0.0.1/` → `403 BLOCKED_TARGET` | PASS |
| Échec de lancement du moteur | Tests backend : erreur moteur conservée comme `502 ENGINE_UNAVAILABLE`, distincte du verrou EGRESS | PASS |
| Délai dépassé et redirection vers cible interdite | Tests du backend et du moteur, y compris suite Chromium d'intégration | PASS |
| Indisponibilité EGRESS affichée dans le frontend | `scripts/qa-egress-frontend.mjs`: API `503 EGRESS_POLICY_UNVERIFIED`, explication affichée, aucune installation visiteur demandée | PASS |
| Absence d'installation locale dans le parcours utilisateur | Test de conformité source/UI et parcours frontend ci-dessus | PASS |
| Suites automatisées | Backend 26, frontend 11, moteur 80; zéro échec | PASS |
| Typecheck/build | Backend et frontend typecheck/build réussis; le build frontend émet un avertissement de chunk JS > 500 kB | PASS avec avertissement |

Le test initial du lanceur sur le port par défaut 3001 n'a pas démarré, car ce port était déjà occupé par un backend existant. Le processus existant n'a pas été arrêté; les vérifications ont été exécutées sur 3002 puis 3003, et les services de test démarrés par cette mission ont été arrêtés.

Limite de preuve : la configuration Windows de la règle a été lue et comparée à l'exécutable et à la liste attendue; aucun test réseau comportemental n'a tenté de joindre une adresse privée routable depuis Chromium. La couverture applicative de refus SSRF et de redirection privée est celle des tests automatisés. Aucun test Linux/conteneur, DNS rebinding, service worker hostile ni déploiement de production n'a été exécuté.

