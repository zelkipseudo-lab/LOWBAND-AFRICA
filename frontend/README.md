# LowBand Africa — Interface Frontend

Interface utilisateur web moderne, responsive et accessible développée pour LowBand Africa.
Construite avec React 18, TypeScript, Vite et Tailwind CSS.

---

## 1. Principes et règles obligatoires

- **Thèmes clair et sombre** construits avec des rôles sémantiques dans `src/theme/tokens.css` : toile, surface, texte, texte secondaire, accent, bordure, avertissement et erreur.
- **Palette centralisée** : les composants consomment ces rôles Tailwind et ne codent pas directement leurs couleurs. Le thème choisi est mémorisé localement.
- **Interdiction absolue des emojis :**
  - Aucun caractère emoji dans les sources (JSX, TSX, TS, CSS, HTML, commentaires).
  - Utilisation exclusive d'icônes vectorielles SVG sobres issues de `lucide-react`.
- **Intégrité des données :**
  - Aucune fausse métrique générée.
  - Toute donnée non fournie ou non observée par le navigateur est explicitement signalée comme `Indisponible` (jamais de faux zéro).
  - Le score affiché provient exclusivement de la méthodologie calculée par le backend.

---

## 2. Démarrage et commandes locales

Node.js 20+ est requis.

### Installation

```powershell
cd frontend
npm.cmd install
```

### Lancement du serveur de développement

```powershell
npm.cmd run dev
```

L'application démarre sur `http://127.0.0.1:5173`.
Les requêtes `/api/*` sont automatiquement redirigées vers le backend local `http://127.0.0.1:3001` via le proxy Vite intégré.

### Vérification des types TypeScript

```powershell
npm.cmd run typecheck
```

### Exécution des tests automatisés

```powershell
npm.cmd test
```

La suite de tests vérifie :
1. La présence des deux thèmes et des rôles sémantiques centralisés.
2. L'absence totale d'emojis dans tous les fichiers sources.
3. Le bon formatage des octets, durées, pourcentages et dates (y compris la gestion des `null`).
4. La présence et la conformité des 4 profils réseau contractuels (`fast`, `4g`, `3g`, `slow_3g`).
5. Les libellés explicites d'erreurs techniques pour les non-spécialistes.

Le contrôle du DOM calculé (deux thèmes, couleurs issues des tokens et emojis) est disponible avec `npm.cmd run test:visual`. Il requiert le serveur frontend démarré sur `127.0.0.1:5173` et Playwright/Chromium installé dans `engine/`.

### Compilation pour la production

```powershell
npm.cmd run build
```

Les livrables statiques sont générés dans `frontend/dist/`. Le point d'entrée JavaScript initial reste inférieur à 68 Ko gzip; la fenêtre de méthodologie est chargée à la demande dans son propre fragment.

---

## 3. Configuration et variables d'environnement

Consulter `.env.example`.
Par défaut, si aucune variable n'est définie, le frontend utilise le chemin relatif `/api/v1/...` pris en charge par le proxy Vite en développement ou par le serveur hôte en production.

Pour cibler une instance API distante spécifique :

```env
VITE_API_BASE_URL=http://127.0.0.1:3001
```

---

## 4. Organisation des dossiers

```text
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── api/
│   │   └── client.ts            # Couche d'accès API centralisée
│   ├── types/
│   │   └── api.ts               # Types stricts du contrat v1
│   ├── constants/
│   │   └── profiles.ts          # Définition des 4 profils réseau
│   ├── utils/
│   │   └── format.ts            # Utilitaires de formatage sans faux zéros
│   └── components/
│       ├── Header.tsx           # Navigation principale et identité
│       ├── Footer.tsx           # Mentions méthodologiques et sécurité
│       ├── HealthBadge.tsx      # Indicateur d'état du backend en direct
│       ├── HeroSection.tsx      # Présentation de la mission et CTA
│       ├── AnalysisForm.tsx     # Saisie d'URL et sélecteur de profil
│       ├── LoadingState.tsx     # État de chargement sans fausse progression
│       ├── ScoreCard.tsx        # Carte Africa Ready Score et 4 composantes
│       ├── MetricsGrid.tsx      # Grille des métriques réelles CDP
│       ├── ResourceDistribution.tsx # Répartition des octets par ressource
│       ├── RecommendationsList.tsx  # Recommandations déterministes avec preuves
│       ├── WarningsList.tsx     # Avertissements et limites d'observation
│       ├── ErrorDisplay.tsx     # Gestion accessible des 11 codes d'erreur
│       └── DocumentationModal.tsx   # Guide méthodologique interactif
└── test/
    ├── compliance.test.ts       # Tests d'absence d'emojis et tokens de thème
    └── utils.test.ts            # Tests des utilitaires et constantes
```
