# Moteur d'analyse — contrat interne et intégration Codex

Version du moteur : `0.1.0`  
Dernière validation : 2026-10-22, Windows, Node.js 24.13.1, Playwright 1.64.1, Chromium 156.0.8078.4.  
Responsable : mission Kimi (exécutée par l'agent de remplacement).

Le moteur est un module interne. Il n'expose aucun endpoint HTTP, ne calcule pas le score et ne remplace pas les protections SSRF du backend. Il collecte des observations réelles et retourne les absences sous forme de `null`.

## 1. Emplacement et intégration

Le code se trouve dans `engine/` à la racine du projet :

```text
engine/
  src/
    analyze.ts                 # orchestration Playwright/Chromium
    profiles.ts                # profils réseau fixes
    errors.ts                  # EngineError et codes internes
    network/collector.ts       # événements CDP -> métriques
    security/target-guard.ts   # validation SSRF (URL, DNS, IP, redirections)
    cli.ts                     # outil de test en ligne de commande
  test/unit/                   # tests sans navigateur
  test/integration/            # tests avec Chromium réel + serveur local
```

### Installation avant intégration

```bash
cd engine
npm ci
npx playwright install chromium
npm run build
```

Sous Windows PowerShell, utiliser `npm.cmd`/`npx.cmd` si les scripts `.ps1` sont bloqués.

### Dépendance locale depuis le backend

Ajouter au `backend/package.json` :

```json
{
  "dependencies": {
    "@lowband/analysis-engine": "file:../engine"
  }
}
```

Puis :

```bash
cd backend
npm install
```

`engine/dist/` doit exister avant l'installation et être reconstruit à chaque modification du moteur (`npm --prefix ../engine run build`). Alternative acceptable : copier `engine/src` dans `backend/src/analysis/engine/` en conservant les imports et la configuration TypeScript, mais la dépendance `file:` évite la duplication.

### Import

```ts
import {
  analyze,
  createTargetGuard,
  EngineError,
  isEngineError,
  type EngineResult,
} from "@lowband/analysis-engine";
```

## 2. Appel recommandé

```ts
const guard = createTargetGuard();

// 1. Validation préalable côté backend (permet de distinguer protocol/URL).
await guard.assertUrlAllowed(input.url);

// 2. Analyse.
const result = await analyze(input.url, {
  profile: input.profile,
  targetGuard: guard,
  totalTimeoutMs: 40_000,
  navigationTimeoutMs: 30_000,
  headless: true,
  disableCache: true,
});
```

- Ne jamais transmettre `noSandbox`, `executablePath`, `headless` ou des arguments Chromium depuis la requête utilisateur.
- Réutiliser la même instance de `guard` pour profiter du cache DNS positif de 5 s ; ne pas le partager entre tenants si une politique par tenant est ajoutée plus tard.
- Le moteur lance et ferme un Chromium par appel. La limite de concurrence reste à appliquer par le backend (valeur initiale : 1).
- `totalTimeoutMs` doit rester inférieur à l'échéance HTTP du backend. 40 s laisse une marge sous la cible de 45 s.

## 3. Résultat

`navigationMs` correspond à l'événement `load`; FCP/LCP viennent de l'horloge Performance Paint Timing. Ce sont deux observations indépendantes. En headless, le premier rendu peut être différé et FCP peut dépasser `navigationMs` ou varier peu entre profils. Le backend ajoute alors un avertissement explicite. Ces valeurs ne sont pas réconciliées artificiellement et la formule de score v1 reste inchangée.

`EngineResult` contient :

| Champ | Usage backend |
|---|---|
| `requestedUrl` | URL analysée à placer dans `url` du contrat public (ou `finalUrl` si le produit décide d'exposer l'URL finale ; aucun champ supplémentaire n'est autorisé en v1) |
| `finalUrl` | Journalisation interne ; non exposé par le contrat v1 |
| `profile` | Profil effectivement demandé et conservé |
| `startedAt` | `startedAt` du rapport |
| `durationMs` | `durationMs` du rapport |
| `metrics` | À recopier tel quel dans `metrics` (`navigationMs`, `fcpMs`, `lcpMs`, `requestCount`, `transferBytes`, `failedRequests`, `resources`) |
| `warnings` | À recopier dans `warnings` |
| `networkEmulation` | Métadonnée interne de preuve d'application ; journaliser, **ne pas exposer** en v1 |

Le moteur ne retourne ni `analysisId`, ni `status`, ni `score`, ni `recommendations`. Le backend génère `analysisId`, fixe `status: "completed"`, calcule le score selon `docs/scoring.md` et produit les recommandations déterministes.

Un résultat peut être `completed` avec `fcpMs`, `lcpMs` ou `transferBytes` à `null` : c'est conforme. Ne jamais remplacer une valeur `null` par `0`.

## 4. Erreurs et correspondance API

`EngineError` expose `code` et `toSafeJSON()` (message générique sans détail interne). Les causes (`error.cause`) peuvent être journalisées côté serveur, jamais renvoyées au client.

| Code moteur | Situation | Code API | HTTP |
|---|---|---|---|
| `INVALID_TARGET` | URL mal formée, protocole non HTTP(S), identifiants | `INVALID_URL` ou `UNSUPPORTED_PROTOCOL` (pré-validation backend) | 400 |
| `INVALID_PROFILE` | Profil inconnu ou `unstable` | `INVALID_PROFILE` | 400 |
| `BLOCKED_TARGET` | Cible ou redirection non publique | `BLOCKED_TARGET` | 403 |
| `ANALYSIS_TIMEOUT` | Échéance totale dépassée | `ANALYSIS_TIMEOUT` | 408 |
| `NAVIGATION_FAILED` | DNS, connexion, certificat, navigation échouée | `NAVIGATION_FAILED` | 502 |
| `ENGINE_UNAVAILABLE` | Chromium introuvable ou lancement impossible | `ENGINE_UNAVAILABLE` | 502 |
| `ANALYSIS_FAILED` | Erreur inconnue du moteur | `INTERNAL_ERROR` | 500 |

Le backend doit valider l'URL et le profil **avant** l'appel pour produire les codes précis `INVALID_URL`, `UNSUPPORTED_PROTOCOL` et `INVALID_PROFILE`. Le moteur reste une seconde barrière.

Pré-validation conseillée :

```ts
import { TargetGuardError, isNetworkProfileId } from "@lowband/analysis-engine";

if (!isNetworkProfileId(profile)) {
  // 400 INVALID_PROFILE
}

try {
  await guard.assertUrlAllowed(url);
} catch (error) {
  if (error instanceof TargetGuardError) {
    // INVALID_URL -> INVALID_URL (400)
    // UNSUPPORTED_PROTOCOL -> UNSUPPORTED_PROTOCOL (400)
    // BLOCKED_TARGET -> BLOCKED_TARGET (403)
    // DNS_RESOLUTION_FAILED -> NAVIGATION_FAILED (502)
  }
  // sinon INTERNAL_ERROR
}
```

`TargetGuardError` n'est pas un `EngineError` : mapper explicitement ses `reason` avant de lancer Chromium.

## 5. Sécurité — obligations backend

`createTargetGuard()` fournit une défense applicative :

- HTTP/HTTPS uniquement, ports 80/443 ;
- refus des identifiants, noms locaux, hôtes mono-étiquette, suffixes `.local`, `.internal`, `.localdomain`, etc. ;
- résolution A/AAAA et refus si une adresse est loopback, privée, link-local, CGNAT, multicast, réservée, ULA, IPv4-mapped, 6to4, NAT64, etc. ;
- validation CDP `Fetch` de chaque requête **et redirection** avant connexion ;
- cache DNS positif de 5 s pour les performances.

**Ce n'est pas une isolation réseau complète.** Avant toute exposition publique, Codex doit :

1. Ajouter une politique de sortie réseau (conteneur, firewall ou proxy sortant) interdisant les plages RFC1918, loopback, link-local, ULA et les endpoints de métadonnées.
2. Vérifier le réseau réellement accessible depuis Chromium (pas seulement depuis Node).
3. Appliquer la limitation de concurrence, de durée, de taille et de fréquence prévue par `docs/security.md`.
4. Ne pas exposer publiquement si l'isolation réseau n'est pas vérifiée.

Le cache DNS de 5 s laisse une fenêtre théorique de DNS rebinding : la politique de sortie réseau reste indispensable. Voir `docs/security.md` et la décision 012.

## 6. Points de vigilance d'intégration

- **Score** : utiliser les métriques du moteur, jamais des valeurs inventées ; respecter la règle « null ≠ zéro » de `docs/scoring.md`.
- **Recommandations** : ne les émettre que si les conditions de preuve sont satisfaites avec les champs présents.
- **Timeout** : passer une échéance explicite (recommandé 40 s / 30 s). Le moteur tente de retourner un résultat partiel si la navigation expire, mais une expiration totale produit `ANALYSIS_TIMEOUT`.
- **Nettoyage** : le moteur ferme page, contexte et navigateur dans `finally`. `AnalyzeOptions.signal` est pris en charge : une déconnexion HTTP annule l'analyse et déclenche le nettoyage (`ANALYSIS_CANCELLED`, erreur interne non exposée au client).
- **Chromium** : installer le navigateur dans l'image de déploiement (`npx playwright install --with-deps chromium`). Prévoir mémoire et espace disque. `--no-sandbox` n'est à activer que si le conteneur l'exige, car il réduit l'isolation.
- **Logs** : journaliser `engineVersion`, profil, `durationMs`, codes d'erreur et nombre d'avertissements. Ne pas journaliser cookies, corps de page, en-têtes sensibles ou adresses internes résolues.
- **Champs publics** : ne pas ajouter `engineVersion`, `networkEmulation` ou `finalUrl` à la réponse v1 sans mise à jour du contrat et des tests.

## 7. Vérifications déjà exécutées

```bash
cd engine
npm run typecheck   # OK
npm test            # 79 tests réussis
npm run build       # OK
```

Analyses publiques réelles du 2026-10-22 :

| URL | Profil | Durée | Navigation | FCP | LCP | Requêtes | Transfert | Échecs |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `https://example.com/` | `slow_3g` | 4 437 ms | 1 308 ms | 800 ms | 1 332 ms | 2 | 2 024 o | 0 |
| `https://example.com/` | `4g` | 3 548 ms | 914 ms | 724 ms | 928 ms | 2 | 2 022 o | 0 |
| `https://www.wikipedia.org/` | `3g` | 5 100 ms | 1 815 ms | 1 808 ms | 1 808 ms | 6 | 79 856 o | 0 |

Ces valeurs sont des observations ponctuelles, pas des références de performance.

Tests de sécurité exécutés : `127.0.0.1`, `169.254.169.254`, plages privées, IPv6 loopback/ULA/link-local, IPv4-mapped, IP encodées en décimal/hexadécimal/octal, redirection bloquée, sous-ressource bloquée, port non autorisé.

## 8. Limites restantes

- Un seul passage par analyse ; aucune moyenne ni comparaison statistique.
- LCP lu après une fenêtre de 2 s ; il peut encore évoluer.
- Les octets partiels des requêtes échouées/non terminées ne sont pas comptés (avertissement explicite).
- Service workers et cache peuvent masquer une partie du transfert (avertissements).
- Pas d'émulation CPU/appareil mobile, pas de perte de paquets, pas de profil `unstable`.
- Pas de plafond strict de requêtes par page.
- Validation Windows uniquement ; Linux/conteneur à confirmer.
- L'isolation réseau reste à fournir par le backend/déploiement.
