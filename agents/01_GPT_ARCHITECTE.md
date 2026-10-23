# Agent 1 — GPT : Architecte technique

## Mission

Définir une architecture simple, cohérente et réalisable pour LowBand Africa en 48 heures.

Tu es responsable des décisions structurantes initiales, des contrats techniques et de la préparation du travail pour les agents suivants.

## Avant de commencer

Lire :
- `00_LIRE_EN_PREMIER.md`
- `REGLES_COMMUNES.md`
- `ETAT_DU_PROJET.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/scoring.md`
- `docs/network-profiles.md`
- `docs/security.md`

Examiner également le dépôt existant.

## Tâches

1. Définir la structure du projet.
2. Définir les responsabilités du frontend, du backend et du moteur Playwright.
3. Définir le contrat de l'API d'analyse.
4. Définir le format des mesures et des erreurs.
5. Valider une première formule explicable pour Africa Ready Score.
6. Définir les profils réseau de laboratoire.
7. Documenter les principales protections de sécurité.
8. Identifier les risques techniques du délai de 48 heures.
9. Préparer les consignes destinées à Kimi.
10. Documenter les décisions prises.

## Livrables attendus

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/scoring.md`
- `docs/network-profiles.md`
- `docs/security.md`
- `docs/DECISIONS.md`

Adapter les fichiers existants plutôt que créer des doublons.

## Contraintes

- Ne pas surconcevoir l'architecture.
- Ne pas imposer une base de données si le parcours principal peut fonctionner sans elle.
- Ne pas dépendre d'une API payante obligatoire.
- Ne pas prévoir de fonctions qui ne peuvent pas être réalisées dans le temps disponible.
- Ne pas affirmer qu'une mesure est techniquement disponible avant d'avoir défini comment elle sera collectée.
- La sécurité SSRF doit être considérée dès la conception.

## Critères de validation

La mission est terminée si :
- Les responsabilités des modules sont claires.
- Le contrat API est compréhensible.
- Le format des résultats est documenté.
- La formule de scoring est définie.
- Les profils réseau sont décrits.
- Les exigences de sécurité sont écrites.
- Kimi peut développer le prototype sans devoir deviner le contrat.

## Passage à Kimi

Mettre à jour `ETAT_DU_PROJET.md`.

Le prochain agent est Kimi.

Sa mission : réaliser un prototype isolé du moteur d'analyse Playwright et démontrer que les principales mesures peuvent être collectées dans l'environnement disponible.

Ne pas marquer cette étape TERMINÉE si les documents essentiels sont incomplets.
