# Moteur d'analyse — LowBand Africa

Module Node.js/TypeScript qui ouvre une URL publique avec Playwright/Chromium, applique un profil réseau de laboratoire, observe les requêtes et les métriques de performance disponibles, puis retourne des mesures brutes. Le moteur ne calcule ni score ni recommandations : cette responsabilité reste au backend.

Statut : prototype fonctionnel, testé localement le 2026-10-22. Version `0.1.0`.

## Prérequis

- Node.js >= 20 (testé avec Node.js 24.13.1 sur Windows).
- npm.
- Chromium Playwright (installé séparément, environ 200 Mo).
- Connexion réseau sortante pour analyser des sites publics.

## Installation

```bash
cd engine
npm install
npx playwright install chromium
npm run build
```

Sous PowerShell, si `npm.ps1` est bloqué par la politique d'exécution Windows, utiliser `npm.cmd` et `npx.cmd`.

## Utilisation en ligne de commande

```bash
npm run analyze -- https://example.com/ --profile slow_3g
npm run analyze -- https://example.com/ --profile 3g --json
npm run analyze:built -- https://example.com/ --profile fast --json
```

Options :

| Option | Effet |
|---|---|
| `--profile <fast\|4g\|3g\|slow_3g>` | Profil réseau, défaut `4g` |
| `--json` | Sortie JSON complète |
| `--no-guard` | Désactive la garde de cible — **tests locaux uniquement** |
| `--headed` | Chromium avec fenêtre |
| `--no-sandbox` | Nécessaire dans certains conteneurs ; réduit l'isolation |
| `--allow-cache` | Laisse le cache Chromium actif (désactivé par défaut) |
| `--timeout-ms <ms>` | Échéance totale, défaut 45 000 ms |
| `--navigation-timeout-ms <ms>` | Échéance de navigation, défaut 30 000 ms |

La garde de cible est active par défaut. Toute URL locale, privée, link-local, de métadonnées ou résolue vers une telle adresse est refusée avant le lancement du navigateur. Chaque requête et chaque redirection est ensuite revalidée via le domaine CDP `Fetch`.

## Utilisation comme module

```ts
import { analyze, createTargetGuard, isEngineError } from "@lowband/analysis-engine";

try {
  const result = await analyze("https://example.com/", {
    profile: "3g",
    targetGuard: createTargetGuard(),
    totalTimeoutMs: 40_000,
    navigationTimeoutMs: 30_000,
  });
  console.log(result.metrics);
} catch (error) {
  if (isEngineError(error)) {
    console.error(error.code, error.toSafeJSON());
  }
}
```

Le backend doit importer le paquet compilé. Voir `../docs/engine.md` pour l'intégration Codex, la correspondance des erreurs et les précautions de déploiement.

## Format de sortie

```ts
interface EngineResult {
  engineVersion: string;
  requestedUrl: string;
  finalUrl: string | null;
  profile: "fast" | "4g" | "3g" | "slow_3g";
  startedAt: string; // ISO-8601 UTC
  durationMs: number;
  metrics: {
    navigationMs: number | null;
    fcpMs: number | null;
    lcpMs: number | null;
    requestCount: number;
    transferBytes: number | null;
    failedRequests: number;
    resources: {
      javascriptBytes: number | null;
      cssBytes: number | null;
      imageBytes: number | null;
      fontBytes: number | null;
      otherBytes: number | null;
    };
  };
  networkEmulation: {
    profile: string;
    downloadKbps: number;
    uploadKbps: number;
    latencyMs: number;
    packetLossPercent: null;
    applied: true;
    method: "cdp_network_emulateNetworkConditions";
  };
  warnings: string[];
}
```

`metrics` reprend exactement les clés du contrat API. `networkEmulation` est une métadonnée interne : le backend peut la journaliser, mais le contrat public v1 ne l'expose pas.

## Sémantique des mesures

- `navigationMs` : `loadEventEnd` de Navigation Timing. Si Navigation Timing est absent après un chargement réussi, la durée murale jusqu'à `load` est utilisée et un avertissement est ajouté. En cas d'expiration de la navigation, la valeur est `null`.
- `fcpMs` / `lcpMs` : PerformanceObserver injecté avant la navigation, avec repli sur les entrées `paint`. Le LCP est lu après une fenêtre d'attente de 2 s par défaut. `null` si aucun candidat n'est observé.
- `requestCount` : nombre de requêtes CDP distinctes (`requestId`). Les redirections d'une même chaîne sont comptées une fois.
- `failedRequests` : requêtes terminées par `Network.loadingFailed` ou par un statut HTTP >= 400, sans double comptage.
- `transferBytes` : somme des `encodedDataLength` rapportés par `Network.loadingFinished`. Ce sont des octets réseau encodés observés par Chromium, pas la taille décodée des fichiers ni une estimation incluant TLS/HTTP2. Les octets partiels de requêtes échouées ou non terminées ne sont pas comptés ; un avertissement le signale. Si aucune réponse n'est terminée, la valeur est `null`.
- `resources` : répartition des mêmes octets par type de ressource CDP. `Script` → JavaScript, `Stylesheet` → CSS, `Image` → images, `Font` → polices, tout le reste (document, XHR, fetch, média, websocket, etc.) → autres. `null` si le total est indisponible.

Une mesure absente n'est jamais transformée en zéro. Les avertissements décrivent chaque limite observée.

## Profils réseau

| Profil | Descendant | Montant | Latence | Perte |
|---|---:|---:|---:|---:|
| `fast` | 20 Mbps | 10 Mbps | 20 ms | non simulée |
| `4g` | 10 Mbps | 5 Mbps | 50 ms | non simulée |
| `3g` | 1,5 Mbps | 750 Kbps | 150 ms | non simulée |
| `slow_3g` | 400 Kbps | 200 Kbps | 400 ms | non simulée |

Application via CDP `Network.emulateNetworkConditions` avant la navigation. La perte de paquets n'est pas supportée par cette API et reste `null` ; le profil `unstable` est refusé (`INVALID_PROFILE`).

Preuve de débit sur la fixture locale (143 914 octets, 2026-10-22) : `fast` 252 ms, `4g` 347 ms, `3g` 1 279 ms, `slow_3g` 3 948 ms de navigation. Ces valeurs proviennent d'un seul passage de laboratoire et ne représentent pas un réseau réel.

## Environnement de mesure

- Contexte Chromium neuf et fermé pour chaque analyse (`finally`), sans persistance.
- Cache HTTP désactivé par défaut (`Network.setCacheDisabled`) ; les réponses servies par un service worker restent possibles et sont signalées.
- Fenêtre 1366 × 768, facteur d'échelle 1, mode headless par défaut.
- Pas d'émulation d'appareil mobile, de CPU lent, de perte de paquets ni de variabilité temporelle.
- Aucun cookie, identifiant ou script fourni par l'utilisateur n'est accepté.
- Téléchargements refusés ; HTTPS non contourné (`ignoreHTTPSErrors: false`).

## Sécurité SSRF

`createTargetGuard()` applique :

- HTTP/HTTPS uniquement, ports 80/443 ;
- refus des identifiants intégrés, hôtes vides, noms mono-étiquette et suffixes locaux (`localhost`, `.local`, `.internal`, `.localdomain`, etc.) ;
- résolution DNS A/AAAA par `dns.lookup` et refus si **une** adresse obtenue n'est pas publique ;
- classification par `ipaddr.js` : loopback, privé, link-local, CGNAT, multicast, réservé, ULA, IPv4-mapped, 6to4, NAT64, etc. ;
- revalidation de chaque requête et redirection via CDP `Fetch` avant `continueRequest` ;
- cache DNS positif de 5 s pour limiter le coût, durée pendant laquelle une attaque de DNS rebinding reste théoriquement possible.

Limite importante : cette garde applicative ne remplace pas une isolation réseau. Chromium peut résoudre une adresse différemment de `dns.lookup`, et le cache de 5 s laisse une fenêtre. Le backend doit ajouter une politique de sortie (conteneur/firewall) interdisant les plages internes et les métadonnées avant toute exposition publique. Voir `../docs/security.md`.

## Tests

```bash
npm run typecheck
npm test
npm run test:unit
npm run test:integration
npm run build
```

Résultat du 2026-10-22 : **79 tests réussis**, 4 fichiers, aucune erreur de type ni de build. Les tests d'intégration lancent réellement Chromium contre un serveur local et vérifient navigation, ressources, FCP/LCP, latence/débit, blocage local, validation de redirection, expiration de navigation et échec de connexion.

## Limites connues

- Mesures d'un seul passage : pas de moyenne, pas de percentile, pas de comparaison statistique.
- Le LCP peut évoluer après le `load` ; la fenêtre de 2 s est un compromis, pas une garantie de stabilisation.
- Les requêtes échouées ou interrompues n'apportent pas leurs octets partiels ; le total est celui des réponses terminées, signalé par avertissement.
- Les service workers et les réponses synthétiques peuvent masquer le transfert réseau réel.
- Le navigateur headless, le viewport fixe et l'absence de CPU throttling ne représentent pas un smartphone africain réel.
- La garde DNS/CDP n'est pas une isolation réseau complète (rebinding, résolution propre à Chromium).
- Aucun plafond strict du nombre de requêtes par page ; la limite repose sur l'échéance totale, la concurrence côté backend et les limites de l'hôte.
- Testé sur Windows uniquement ; le comportement Linux/conteneur reste à valider, notamment `--no-sandbox`.
- Le score et les recommandations ne sont pas implémentés ici (mission Codex/backend).
