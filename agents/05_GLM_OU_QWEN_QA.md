# Agent 5 — GLM ou Qwen : Assurance qualité, scoring et sécurité

## Mission

Effectuer un audit indépendant de LowBand Africa, trouver les défauts importants et proposer ou réaliser des corrections ciblées.

Tu dois vérifier le produit réel, et non seulement lire le code puis déclarer qu'il fonctionne.

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

Examiner le dépôt, les tests et les commandes d'exécution.

## Axe 1 — Fonctionnement de bout en bout

Vérifier :
- Le frontend démarre.
- Le backend démarre.
- Le frontend communique avec le backend.
- Une URL publique autorisée peut être analysée.
- Le moteur renvoie des mesures.
- Le score est calculé.
- Les recommandations sont affichées.
- Les erreurs sont gérées.
- Le parcours reste utilisable sur mobile.

Ne pas affirmer qu'un test est réussi si l'environnement ne permet pas de l'exécuter.

## Axe 2 — Exactitude des mesures

Examiner :
- L'origine des mesures.
- Les unités.
- Les valeurs manquantes.
- Les doublons éventuels.
- Les limites de collecte.
- La cohérence entre la réponse API et l'interface.

Identifier toute valeur fictive ou toute métrique présentée comme réelle sans preuve.

## Axe 3 — Scoring

Vérifier :
- La formule utilisée.
- Les bornes des sous-scores.
- Le traitement des données manquantes.
- La cohérence des pondérations.
- La reproductibilité du résultat.
- L'explication présentée à l'utilisateur.

Le score est un indicateur propre au produit. Il ne doit pas être présenté comme une norme officielle.

## Axe 4 — Sécurité

Inspecter en priorité :
- SSRF.
- Accès aux adresses locales et privées.
- Redirections vers des cibles interdites.
- DNS rebinding.
- Services de métadonnées cloud.
- Limites de durée et de ressources.
- Gestion des erreurs.
- Exposition de secrets.
- Risques d'épuisement des ressources.
- Validation des entrées.

Ne pas lancer de tests agressifs sur des sites ou infrastructures sans autorisation.

## Axe 5 — Interface et accessibilité

Vérifier :
- La navigation au clavier.
- Les contrastes.
- Les libellés.
- Les états d'erreur.
- Les écrans de chargement.
- Les dimensions mobiles.
- Les messages en cas de mesures indisponibles.

## Livrable obligatoire

Créer `docs/QA_REPORT.md` contenant :
- Résumé exécutif.
- Tests effectués.
- Commandes exécutées.
- Résultats vérifiables.
- Défauts classés par gravité.
- Étapes de reproduction.
- Fichiers concernés.
- Corrections réalisées.
- Problèmes restant ouverts.
- Verdict : prêt, prêt avec réserves ou non prêt.

## Priorité des défauts

P0 : faille critique, parcours principal inutilisable, données trompeuses.

P1 : fonction majeure défaillante, calcul incorrect ou défaut important de sécurité.

P2 : défaut secondaire ou amélioration de qualité.

## Passage à GPT et Codex

Mettre à jour `ETAT_DU_PROJET.md`.

Les prochains agents sont GPT et Codex.

Leur mission : corriger les défauts prioritaires, vérifier l'intégration finale et préparer le déploiement.

Ne pas déclarer le produit prêt si des défauts P0 restent ouverts.
