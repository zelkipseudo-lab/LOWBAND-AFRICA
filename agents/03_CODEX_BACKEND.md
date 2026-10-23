# Agent 3 — Codex : Backend et intégration

## Mission

Construire ou compléter le backend Node.js/TypeScript/Express de LowBand Africa et intégrer le moteur d'analyse validé par Kimi.

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

Examiner le prototype de Kimi et le dépôt existant avant toute modification.

## Tâches prioritaires

1. Initialiser ou adapter le serveur Express.
2. Créer les routes documentées dans le contrat API.
3. Valider les données entrantes.
4. Intégrer le moteur Playwright.
5. Implémenter la validation sécurisée des URL.
6. Ajouter des limites de temps et de taille.
7. Contrôler les redirections.
8. Ajouter des limites de concurrence et de fréquence.
9. Calculer le score à partir des mesures disponibles.
10. Produire des recommandations fondées sur les résultats.
11. Renvoyer des erreurs cohérentes.
12. Écrire des tests unitaires et API.
13. Préparer les commandes de démarrage et de production.

## API

Respecter `docs/api-contract.md`.

Le frontend ne doit pas avoir à deviner les noms des champs ou le format des erreurs.

Si un contrat doit être modifié, documenter la raison et adapter tous les modules concernés.

## Sécurité SSRF

Le backend accepte des URL fournies par l'utilisateur et les ouvre avec un navigateur automatisé. C'est une surface d'attaque importante.

Mettre en œuvre des protections adaptées :
- Protocoles HTTP/HTTPS uniquement.
- Blocage des adresses locales et privées.
- Contrôle DNS et des adresses IP résolues.
- Contrôle des redirections à chaque étape pertinente.
- Protection contre les accès aux services de métadonnées cloud.
- Restrictions de ports et de durée.
- Isolation du navigateur.
- Limitation des ressources et des tâches simultanées.
- Absence d'accès arbitraire aux fichiers ou au système hôte.

Ne pas se contenter de vérifier que l'URL commence par `http://` ou `https://`.

La résolution DNS et les redirections doivent être traitées avec soin pour limiter les contournements.

## Gestion des tâches

Pour la version minimale, privilégier une architecture simple.

Si l'analyse est synchrone :
- Appliquer un délai maximal.
- Gérer les requêtes interrompues.
- Éviter les analyses infinies.

Si l'analyse est asynchrone :
- Définir les identifiants de tâche et le mécanisme de consultation du statut.
- Documenter les états possibles.
- Éviter de complexifier le projet si le temps ne le permet pas.

## Score et recommandations

Utiliser les documents de scoring.

Une mesure indisponible ne doit pas être transformée arbitrairement en zéro ni inventée. Le score doit gérer explicitement les données manquantes.

Les recommandations doivent être associées à des mesures ou à des observations.

## Tests attendus

- URL valide.
- URL mal formée.
- Protocole interdit.
- Adresse locale ou privée bloquée.
- Erreur de navigation.
- Délai dépassé.
- Résultat partiel.
- Mesure manquante.
- Calcul du score.
- Format des réponses API.
- Limites d'exécution.

## Livrables

- Backend exécutable.
- API documentée.
- Intégration du moteur.
- Tests réellement exécutés.
- Configuration d'environnement documentée.
- Instructions de lancement.
- Liste des risques restants.

## Passage à Antigravity

Mettre à jour `ETAT_DU_PROJET.md`.

Le prochain agent est Antigravity.

Sa mission : construire le frontend responsive et le connecter à l'API réellement disponible.

Fournir à Antigravity l'URL locale du backend, les commandes de démarrage et les exemples réels de réponses API.
