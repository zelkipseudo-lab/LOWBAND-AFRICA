# Profils réseau de laboratoire — LowBand Africa

Les profils sont des émulations de laboratoire, pas des représentations garanties des réseaux d'un pays, d'un opérateur ou d'un usager. Les valeurs sont des cibles initiales, à vérifier dans l'environnement Playwright/Chromium.

| ID API | Débit descendant | Débit montant | Latence ajoutée aller-retour | Perte | État |
|---|---:|---:|---:|---:|---|
| `fast` | 20 Mbps | 10 Mbps | 20 ms | non simulée | vérifié via CDP, 2026-10-22 |
| `4g` | 10 Mbps | 5 Mbps | 50 ms | non simulée | vérifié via CDP, 2026-10-22 |
| `3g` | 1,5 Mbps | 750 Kbps | 150 ms | non simulée | vérifié via CDP, 2026-10-22 |
| `slow_3g` | 400 Kbps | 200 Kbps | 400 ms | non simulée | vérifié via CDP, 2026-10-22 |

Le profil `unstable` n'est pas accepté par le contrat v1 : aucune méthode déterministe d'instabilité n'est définie. Ne le réactiver qu'après définition (graine, intervalles, distribution, durée, coupures), implémentation et test observé.

## Application et compte rendu

Kimi doit confirmer les unités et sémantiques supportées par la version utilisée de Playwright/Chromium. Réseau émulé via le mécanisme Chromium approprié (par exemple CDP `Network.emulateNetworkConditions`) avant navigation; ne pas inventer une perte de paquets si l'outil ne la prend pas en charge. Si le débit/latence n'a pas été appliqué, l'analyse doit échouer ou retourner un avertissement explicite; elle ne doit pas être étiquetée comme le profil demandé sans signalement.

### Validation du moteur (2026-10-22)

Environnement : Node.js 24.13.1, Playwright 1.64.1, Chromium 156.0.8078.4, Windows. Application avant navigation via CDP `Network.emulateNetworkConditions` avec `downloadThroughput` et `uploadThroughput` convertis en octets/seconde (`kbps * 1000 / 8`) et `latency` en millisecondes. La commande CDP a été acceptée pour les quatre profils et les analyses réelles ont conservé le profil demandé.

Preuve de débit sur une fixture locale servant 143 914 octets (un passage par profil, navigation jusqu'à `load`) :

| Profil | `navigationMs` observé |
|---|---:|
| `fast` | 252 ms |
| `4g` | 347 ms |
| `3g` | 1 279 ms |
| `slow_3g` | 3 948 ms |

L'ordre et les écarts sont cohérents avec les débits et latences configurés. Ce sont des mesures ponctuelles de laboratoire, pas une validation statistique ni une représentation d'un réseau réel.

La perte de paquets n'est pas exposée par `Network.emulateNetworkConditions` dans cette version : elle reste `null` et le champ `packetLossPercent` ne prétend pas simuler 0 %. Le profil `unstable` reste refusé (`INVALID_PROFILE`).

Le serveur associe l'ID public à une configuration fixe, le client ne choisit pas les débits. Conserver le profil sélectionné dans le résultat. Si le moteur peut retourner des métadonnées d'émulation, elles doivent refléter les paramètres effectivement appliqués.

Un profil donné ne garantit pas des résultats identiques : cache, contenu dynamique, origine distante et charge varient. Un seul passage n'est pas une comparaison statistique. Documenter la fenêtre de collecte et la politique de cache réellement utilisée; ne pas comparer des profils si les conditions diffèrent de façon non contrôlée.
