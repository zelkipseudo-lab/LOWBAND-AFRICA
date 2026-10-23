# Africa Ready Score — Méthodologie v1.0

Indicateur expérimental propre au produit, non une norme ou certification. Score entier de 0 à 100, calculé par le backend depuis les observations réelles d'une seule navigation avec le profil indiqué. Le résultat est une mesure ponctuelle, sensible à la variabilité du site et du réseau; un seul passage ne constitue pas une comparaison statistique. Même entrée et observations donnent le même résultat.

## Sous-scores (0–100)

Chaque fonction `clamp(0,100, ...)`; les seuils sont des choix de produit à calibrer après résultats de laboratoire.

**Performance (P)** : mesure la durée `navigationMs` et FCP, avec LCP si disponible. Pour une durée `t` en ms, `s(t)=clamp(0,100,100*(1-t/T))`. `s_nav` avec T=10000, `s_fcp` avec T=5000, `s_lcp` avec T=8000. Moyenne des valeurs disponibles, poids égaux. Nécessite au moins navigationMs ou FCP/LCP.

**Efficacité des données (D)** : `s(transferBytes)` avec T=2 000 000 octets. Nécessite un total fiable `transferBytes`.

**Optimisation des ressources (R)** : `0.7*s(transferBytes, T=1 000 000) + 0.3*s(requestCount, T=100)`. Nécessite les deux métriques. Ce sous-score réutilise la taille et le nombre comme indicateurs de coût de chargement; il ne prétend pas détecter compression, cache ou défauts de code. Le sous-score D donne davantage de poids au budget total, tandis que R représente la complexité/empreinte des ressources.

**Résilience observée (N)** : `100*(1 - failedRequests/requestCount)`, borné à [0,100], si requestCount > 0. Nécessite un décompte cohérent de requêtes et d'échecs. C'est le taux de succès observé sur cette navigation, pas une promesse de fiabilité générale.

## Score global et données manquantes

`Score = 0.30*P + 0.30*D + 0.20*R + 0.20*N`, en renormalisant uniquement sur les sous-scores disponibles. `availableWeight` est la somme des poids d'origine disponibles, entre 0 et 1. Publier `score.value=null`, `label="incomplete"`, et les composantes calculables si moins de deux composantes sont calculables ou si `availableWeight < 0.50`. Sinon calculer la somme pondérée divisée par `availableWeight`, arrondie à l'entier le plus proche. Les métriques `null` n'apportent aucun point et ne sont jamais assimilées à zéro.

Labels : `excellent` 80–100; `acceptable` 60–79; `needs_improvement` 40–59; `poor` 0–39; `incomplete` score null. Ces seuils sont informatifs et non normatifs.

`components` contient toujours les quatre clés avec nombre ou `null`. `methodologyVersion` vaut `1.0`. Modifier un seuil ou une formule exige version nouvelle et décision consignée.

## Recommandations déterministes

- `REVIEW_IMAGES`: si `transferBytes` et `imageBytes` sont connus et imageBytes/transferBytes ≥ 0.40.
- `REVIEW_JAVASCRIPT`: si transferBytes et javascriptBytes sont connus et JS/total ≥ 0.30.
- `REDUCE_REQUESTS`: si requestCount > 60.
- `INVESTIGATE_FAILED_REQUESTS`: si requestCount > 0 et failedRequests/requestCount > 0.05.

Joindre dans `evidence` la valeur effectivement calculée (part en fraction ou compte). Le texte recommande une investigation; il ne promet aucun gain. Pas d'estimation de réduction de poids.
