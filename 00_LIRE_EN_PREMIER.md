# LOWBAND AFRICA
## Document principal — Vision, objectifs et organisation du projet

Version : 1.0
Durée de réalisation : 48 heures
Type : Application web responsive
Objectif : Construire, tester et déployer une plateforme réelle d'analyse de sites web dans des conditions de réseau limitées.

---

## 1. Présentation du projet

LowBand Africa est une plateforme qui permet aux développeurs, entreprises, organisations et créateurs de sites web d'évaluer les performances de leurs sites dans des conditions de connexion difficiles.

L'objectif est d'aider à identifier les sites qui consomment trop de données, chargent lentement ou fonctionnent mal lorsque la connexion est instable.

L'utilisateur doit pouvoir saisir l'URL d'un site, choisir un profil réseau simulé, lancer une analyse réelle et obtenir un rapport compréhensible accompagné de recommandations concrètes.

Le produit doit être conçu pour les réalités des utilisateurs africains, notamment les connexions mobiles limitées, les coûts de données, les appareils modestes et les réseaux instables.

Le produit ne doit pas prétendre représenter parfaitement tous les réseaux africains. Les profils utilisés sont des simulations de laboratoire.

## 2. Objectif final en 48 heures

À la fin des 48 heures, nous voulons obtenir :

- Une application web utilisable et responsive.
- Un frontend fonctionnel.
- Un backend opérationnel.
- Un moteur d'analyse utilisant un véritable navigateur automatisé.
- Des mesures réelles provenant de l'analyse.
- Un score Africa Ready Score explicable.
- Des recommandations générées à partir des résultats réels.
- Une gestion correcte des erreurs et des URL invalides.
- Des protections de sécurité adaptées.
- Des tests essentiels exécutés.
- Une documentation suffisante.
- Une version déployée si l'environnement d'hébergement le permet.

Une interface qui affiche uniquement des données fictives ne constitue pas une réalisation acceptable.

## 3. Fonctionnement attendu

Le parcours principal est le suivant :

1. L'utilisateur ouvre LowBand Africa.
2. Il saisit l'URL d'un site public.
3. Il sélectionne un profil réseau.
4. Le frontend envoie une demande d'analyse au backend.
5. Le backend valide et sécurise la cible.
6. Le moteur ouvre le site dans Chromium avec Playwright.
7. Les conditions réseau sélectionnées sont appliquées.
8. Le moteur collecte les mesures effectivement disponibles.
9. Le backend calcule un score selon une formule documentée.
10. Le système produit des recommandations fondées sur les mesures.
11. Le frontend présente les résultats.
12. L'utilisateur peut consulter un rapport lisible et comparer les profils si cette fonction est prête.

Le système doit distinguer les mesures observées, les valeurs estimées et les données indisponibles.

## 4. Stack technique de référence

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- TypeScript
- Express

### Analyse
- Playwright
- Chromium
- API Performance du navigateur lorsque disponible
- Mesure des requêtes et des ressources effectivement observées

### Tests et qualité
- Vitest ou outil de test équivalent
- Tests API
- Tests du moteur d'analyse
- Tests de sécurité essentiels
- Vérification du build de production

### Déploiement
Le frontend peut être hébergé sur une plateforme statique.
Le backend doit être hébergé sur une infrastructure capable d'exécuter Node.js et Chromium/Playwright.

Un hébergement frontend statique seul ne suffit pas pour exécuter le moteur d'analyse.

Les choix techniques définitifs doivent être enregistrés dans `docs/DECISIONS.md`.

## 5. Priorités du produit

### P0 — Indispensable
- Interface de saisie d'URL.
- Choix du profil réseau.
- Validation et protection des URL.
- Analyse réelle via Playwright.
- Collecte de mesures disponibles.
- Calcul du score.
- Recommandations.
- Affichage des erreurs.
- Parcours complet frontend → backend → moteur → résultats.
- Documentation et tests essentiels.

### P1 — Important si le temps le permet
- Comparaison de plusieurs profils réseau.
- Historique local ou persistant.
- Export du rapport.
- Amélioration de l'accessibilité.
- Amélioration de l'expérience utilisateur.

### P2 — Facultatif
- Comptes utilisateurs.
- Tableau de bord personnel.
- Partage public des rapports.
- Fonctions avancées d'intelligence artificielle.
- Comparaisons avancées entre sites.

Ne sacrifiez jamais le parcours P0 pour ajouter une fonction P2.

## 6. Organisation des agents

Les agents interviennent dans cet ordre :

1. GPT — Architecture et contrats techniques.
2. Kimi — Prototype et moteur d'analyse.
3. Codex — Backend et intégration du moteur.
4. Antigravity — Frontend et expérience utilisateur.
5. GLM ou Qwen — Assurance qualité, scoring et sécurité.
6. GPT et Codex — Intégration finale et livraison.

Chaque agent possède un fichier de mission dans le dossier `agents/`.

L'ordre peut être adapté uniquement si une dépendance technique réelle l'impose. Toute modification doit être inscrite dans `ETAT_DU_PROJET.md`.

## 7. Comment chaque agent doit travailler

Avant de commencer, chaque agent doit lire :

1. Ce fichier.
2. `REGLES_COMMUNES.md`.
3. `ETAT_DU_PROJET.md`.
4. Son fichier de mission.
5. Les documents techniques utiles dans `docs/`.

Chaque agent doit examiner les fichiers réellement présents dans le dépôt avant de modifier le projet.

Il ne doit pas supposer qu'un fichier, une fonction, une API ou un test existe sans le vérifier.

À la fin de sa mission, il doit :
- Résumer les changements.
- Lister les fichiers créés ou modifiés.
- Exécuter les tests adaptés.
- Signaler les problèmes connus.
- Mettre à jour `ETAT_DU_PROJET.md`.
- Indiquer explicitement quel agent doit intervenir ensuite.

## 8. Coordination partagée

Les fichiers Markdown constituent la source commune des instructions.

Ils ne se synchronisent pas automatiquement entre des conversations ou des plateformes IA distinctes.

Pour que le système fonctionne, tous les agents doivent accéder au même dossier de travail ou au même dépôt Git partagé. Après chaque mission, les modifications et le fichier d'état doivent être enregistrés et rendus accessibles au prochain agent.

Aucun agent ne doit annoncer qu'une tâche est terminée uniquement parce qu'il a écrit qu'elle l'était : il doit fournir des éléments vérifiables.

## 9. Définition de la réussite

Le projet est considéré comme livrable lorsque :

- Le frontend peut être lancé.
- Le backend peut être lancé.
- Une URL publique valide peut être analysée.
- Les mesures affichées proviennent de l'analyse ou sont explicitement signalées comme indisponibles.
- Le score est reproductible à partir des données et de la formule.
- Les recommandations sont reliées à des résultats observés.
- Les URL dangereuses sont bloquées.
- Les erreurs sont compréhensibles.
- Les tests essentiels passent.
- Les instructions d'installation et de déploiement sont documentées.

La qualité du résultat prime sur le nombre de fonctionnalités.

## 10. Première action

L'agent qui commence doit consulter `ETAT_DU_PROJET.md`.

Il ne doit pas démarrer une tâche réservée à un agent ultérieur sans nécessité documentée.

La priorité initiale est de définir une architecture simple, des contrats d'API stables et une méthode de mesure réalisable