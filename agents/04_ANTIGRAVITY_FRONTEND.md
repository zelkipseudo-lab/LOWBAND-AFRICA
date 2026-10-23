# Agent 4 — Antigravity : Frontend et expérience utilisateur

## Mission

Construire une interface web professionnelle, claire, responsive et connectée au backend réel de LowBand Africa.

## Avant de commencer

Lire :
- `00_LIRE_EN_PREMIER.md`
- `REGLES_COMMUNES.md`
- `ETAT_DU_PROJET.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/scoring.md`
- `docs/network-profiles.md`

Examiner les fichiers existants et l'API fournie par Codex.

## Direction produit

L'interface doit inspirer confiance et rendre les résultats techniques compréhensibles.

Le produit est destiné aux développeurs, aux entreprises, aux étudiants et aux personnes qui veulent comprendre le comportement de leurs sites dans des conditions réseau limitées.

L'expérience doit rester légère et rapide, y compris sur des appareils modestes.

## Parcours principal

1. Présenter brièvement la valeur de LowBand Africa.
2. Permettre de saisir une URL.
3. Permettre de choisir un profil réseau.
4. Valider les champs côté client pour améliorer l'expérience.
5. Envoyer une demande réelle au backend.
6. Afficher un état de chargement.
7. Afficher les résultats renvoyés par le serveur.
8. Afficher les erreurs avec un langage compréhensible.
9. Présenter le score et expliquer ses grandes composantes.
10. Afficher les mesures et les recommandations.
11. Permettre de relancer une analyse.

La validation frontend ne remplace jamais la validation de sécurité du backend.

## Pages et composants prioritaires

- Page d'accueil ou tableau de bord principal.
- Formulaire d'analyse.
- Sélecteur de profil réseau.
- Indicateur de progression.
- Résumé des résultats.
- Africa Ready Score.
- Cartes de mesures.
- Répartition des ressources.
- Liste de recommandations.
- Section erreurs et limites.
- Comparaison de profils si l'API la permet.

Ne pas afficher de faux chiffres pour remplir l'interface.

## Design

- Hiérarchie visuelle nette.
- Responsive mobile, tablette et ordinateur.
- Contrastes lisibles.
- Navigation clavier.
- Libellés accessibles.
- États de chargement et d'erreur visibles.
- Graphiques lisibles avec légendes.
- Pas d'animations lourdes inutiles.
- Pas de dépendance à des images volumineuses pour comprendre l'interface.

Un design futuriste est acceptable s'il reste utilisable et rapide.

## Intégration

- Utiliser React, Vite, TypeScript et Tailwind selon la stack existante.
- Respecter les types de l'API.
- Ne pas inventer de champs.
- Centraliser l'accès au backend.
- Gérer les erreurs réseau.
- Configurer l'URL du backend via une variable d'environnement.
- Ne pas exposer de secrets dans le frontend.

## États à traiter

- Formulaire vide.
- URL invalide.
- Profil non sélectionné.
- Analyse en cours.
- Analyse réussie.
- Analyse partielle.
- Analyse échouée.
- Backend indisponible.
- Métrique indisponible.
- Résultats incomplets.

## Critères de validation

- Le build de production passe.
- Le formulaire envoie une vraie requête à l'API.
- Les résultats affichés correspondent à la réponse.
- Les erreurs sont compréhensibles.
- Le site fonctionne sur mobile.
- L'interface n'affiche pas de données fictives comme des résultats réels.

## Passage à GLM ou Qwen

Mettre à jour `ETAT_DU_PROJET.md`.

Le prochain agent est GLM ou Qwen.

Sa mission : auditer le fonctionnement, vérifier les calculs, identifier les failles de sécurité et tester les parcours principaux.

Fournir l'URL du frontend, les commandes de démarrage et les étapes de reproduction des tests.
