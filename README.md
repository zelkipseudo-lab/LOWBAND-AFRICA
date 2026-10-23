# LowBand Africa — démarrage local

Plateforme web pour tester et analyser des applications sur connexions faibles : Africa Ready Score, simulation réseau et recommandations. Application locale composée du moteur Playwright/Chromium (`engine/`), de l'API Express (`backend/`) et de l'interface React/Vite (`frontend/`). Le moteur analyse des pages publiques HTTP(S); le backend bloque les cibles locales et privées et reste verrouillé par défaut tant qu'une isolation réseau de sortie n'est pas déclarée et vérifiée.

## Prérequis

- Node.js 20 ou plus récent et npm.
- PowerShell sous Windows; utilisez `npm.cmd` et `npx.cmd` si les scripts PowerShell npm sont bloqués.
- Connexion Internet pour récupérer les dépendances et analyser un site public.
- Chromium Playwright installé par le projet moteur.

## Installation

Depuis la racine du dépôt, dans PowerShell :

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

## Démarrage

L’interface et l’API de santé peuvent être lancées sans déverrouiller Chromium. Pour analyser des sites publics, Windows doit d’abord bloquer depuis le Chromium de Playwright les adresses privées, locales et réservées.

Une seule fois, un administrateur Windows exécute depuis la racine du projet :

```powershell
.\scripts\install-chromium-egress-policy.ps1
```

Si l’exécution des scripts est restreinte, lance cette commande dans PowerShell administrateur sans changer la politique d’exécution de façon permanente :

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\install-chromium-egress-policy.ps1
```

Arrête d’abord tout backend déjà lancé avec `Ctrl+C`. Dans une fenêtre PowerShell normale (non administrateur), démarre ensuite le backend :

```powershell
.\scripts\start-backend-with-verified-egress.ps1
```

Ce script vérifie depuis Chromium que `127.0.0.1` est bloqué et qu’une page HTTPS publique est joignable. Il n’active `LOWBAND_EGRESS_ISOLATION=verified` que pour le processus backend qu’il démarre après réussite de ces vérifications. Si la vérification échoue, l’API reste verrouillée. Ne définis pas cette variable manuellement.

Dans une autre fenêtre PowerShell, démarre l’interface :

```powershell
cd frontend
npm.cmd run dev
```

Interface : <http://127.0.0.1:5173>. API : <http://127.0.0.1:3001/api/v1/health>. Vite transmet `/api/*` au backend local. Arrête chaque processus avec `Ctrl+C`. Après une mise à jour de Playwright/Chromium, relance une fois l’installation administrateur pour actualiser la règle ciblée sur le nouvel exécutable.

Les analyses acceptent les URL HTTP(S) de sites publics sur les ports 80 et 443. Les cibles locales, privées, de métadonnées et les autres ports restent interdits.

## Configuration et vérifications

Voir [`backend/.env.example`](backend/.env.example), [`backend/README.md`](backend/README.md), [`engine/README.md`](engine/README.md) et [`frontend/README.md`](frontend/README.md) pour les détails. `.env.example` est une référence : le backend n'autocharge pas `.env`; définissez les variables dans l'environnement du processus si nécessaire. Tests : `npm.cmd test`, `npm.cmd run typecheck` et `npm.cmd run build` dans chaque module. Le parcours navigateur réel d'un site public nécessite la politique d'isolation ci-dessus.

La version actuelle est destinée à une utilisation et une validation locales. Le déploiement, l'hébergement et la mise en production feront l'objet d'une étape ultérieure.

