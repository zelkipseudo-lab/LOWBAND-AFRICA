# Règles communes à tous les agents — LowBand Africa

## 1. Source de vérité

Le dépôt partagé contient la version de référence du projet.

Avant toute modification :
- Lire `00_LIRE_EN_PREMIER.md`.
- Lire `ETAT_DU_PROJET.md`.
- Lire le fichier de mission de l'agent.
- Examiner le code existant.

Ne pas se baser uniquement sur le résumé d'une conversation précédente.

## 2. Ne pas inventer

Il est interdit de :
- Simuler des mesures tout en les présentant comme réelles.
- Inventer des résultats de tests.
- Affirmer qu'un déploiement fonctionne sans l'avoir vérifié.
- Afficher des gains d'optimisation non mesurés.
- Présenter le score comme une norme officielle.
- Afficher une métrique indisponible comme si elle avait été mesurée.

Toute donnée indisponible doit être représentée par `null`, un état explicite ou un message compréhensible selon le contrat retenu.

## 3. Respect des contrats

Les noms des champs API, les types, les codes d'erreur et la formule de scoring sont définis dans `docs/api-contract.md` et `docs/scoring.md`.

Toute modification incompatible nécessite :
1. Une justification.
2. La mise à jour de la documentation.
3. L'adaptation des composants dépendants.
4. Des tests.
5. Une entrée dans `docs/DECISIONS.md`.

Ne pas modifier seul le contrat partagé pour résoudre rapidement un problème local.

## 4. Qualité du code

- Utiliser TypeScript lorsque la stack le prévoit.
- Garder les modules simples et lisibles.
- Éviter les duplications inutiles.
- Gérer les erreurs explicitement.
- Ne pas laisser de secrets dans le dépôt.
- Ne pas désactiver les contrôles de sécurité pour faire passer un test.
- Ne pas ajouter de dépendance sans raison.
- Préserver les fichiers et fonctionnalités existants qui fonctionnent.

## 5. Sécurité obligatoire

Le backend ouvre des URL fournies par les utilisateurs. Cette fonction crée un risque SSRF.

Il faut notamment :
- Accepter uniquement les protocoles HTTP et HTTPS.
- Bloquer localhost et les adresses privées ou locales.
- Bloquer les adresses link-local et les services de métadonnées cloud.
- Examiner les adresses IPv4 et IPv6.
- Contrôler les redirections.
- Réduire les risques de DNS rebinding.
- Limiter les ports, la durée et la taille des analyses.
- Limiter le nombre de tâches simultanées.
- Isoler le navigateur automatisé.
- Ne pas exposer les informations internes du serveur.
- Ne jamais accepter de code arbitraire fourni par l'utilisateur.

La validation ne doit pas se limiter à une expression régulière sur l'URL.

## 6. Tests

Un test n'est considéré comme réussi que s'il a réellement été exécuté.

Indiquer :
- La commande utilisée.
- Le résultat.
- Les éventuelles limites.
- Les tests non exécutés.

Ne pas supprimer un test simplement parce qu'il échoue. Identifier la cause.

## 7. Collaboration Git

- Utiliser le dépôt commun.
- Vérifier les modifications avant de les écraser.
- Ne pas réinitialiser le dépôt ni supprimer le travail d'un autre agent sans autorisation.
- Faire des commits explicites lorsque le workflow le permet.
- Ne pas annoncer qu'un fichier est disponible si ses modifications n'ont pas été partagées.

## 8. Fin de mission obligatoire

Chaque agent doit :
1. Résumer les changements.
2. Lister les fichiers concernés.
3. Donner les commandes de test et les résultats.
4. Signaler les problèmes connus.
5. Mettre à jour `ETAT_DU_PROJET.md`.
6. Nommer l'agent suivant.
7. Préciser les conditions de reprise.

Si le prochain agent ne peut pas travailler à cause d'un blocage, celui-ci doit être clairement signalé.