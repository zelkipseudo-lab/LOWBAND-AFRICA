# AGENT ROUTER — LOWBAND AFRICA

> **Fichier obligatoire à lire en premier par tout agent IA intervenant sur le projet.**

## 1. Objectif

Ce fichier est le routeur central des agents IA travaillant sur le projet LowBand Africa.

Le projet est actuellement développé entièrement en local. GitHub, Git et les dépôts distants ne sont pas nécessaires pour coordonner les agents.

### Source de vérité

Le dossier local `LowBand-Africa/` est la source de vérité du projet.

Chaque agent doit travailler sur le même dossier local, dans son état actuel. Il ne doit jamais repartir de zéro sans justification explicite.

## 2. Procédure obligatoire

Lorsqu'un agent intervient sur le projet, il doit suivre ces étapes :

1. Lire `AGENT_ROUTER.md`.
2. Identifier honnêtement son modèle, son environnement ou son outil, selon les informations disponibles.
3. Déterminer la mission qui lui correspond.
4. Lire le fichier de mission approprié.
5. Lire `00_LIRE_EN_PREMIER.md`.
6. Lire `REGLES_COMMUNES.md`.
7. Lire `ETAT_DU_PROJET.md`.
8. Consulter les documents techniques nécessaires.
9. Inspecter le code et les fichiers existants.
10. Exécuter sa mission sans écraser inutilement le travail précédent.
11. Tester les modifications réalisées.
12. Mettre à jour `ETAT_DU_PROJET.md`.
13. Documenter les limites, les problèmes et les prochaines étapes.
14. Laisser le dossier dans un état exploitable par l'agent suivant.

**Ne jamais commencer à modifier le projet sans avoir inspecté son état actuel.**

## 3. Workflow multi-agents

Les agents travaillent successivement sur le même dossier local.

Ordre recommandé :

1. GPT — Architecture
2. Kimi — Moteur d'analyse
3. Codex — Backend
4. Antigravity — Frontend
5. GLM ou Qwen — QA et tests
6. GPT + Codex — Intégration et livraison finale

Chaque agent doit exploiter le travail réellement effectué par les agents précédents.

Le passage au prochain agent est effectué manuellement par le responsable du projet après vérification du travail.

## 4. Identification et routage

Chaque agent doit essayer de déterminer honnêtement son identité à partir des informations réellement disponibles.

| Agent ou environnement | Mission | Fichier de mission |
|---|---|---|
| GPT / ChatGPT chargé de l'architecture | Architecture du projet | `agents/01_GPT_ARCHITECTE.md` |
| Kimi | Moteur d'analyse | `agents/02_KIMI_MOTEUR_ANALYSE.md` |
| Codex | Backend | `agents/03_CODEX_BACKEND.md` |
| Antigravity | Frontend | `agents/04_ANTIGRAVITY_FRONTEND.md` |
| GLM ou Qwen | Assurance qualité et tests | `agents/05_GLM_OU_QWEN_QA.md` |
| GPT + Codex chargés de la finalisation | Intégration finale | `agents/06_GPT_CODEX_LIVRAISON.md` |

L'agent doit ouvrir et lire le fichier correspondant à sa mission.

Si son identité est incertaine, il ne doit pas en inventer une. Il doit choisir la mission la plus adaptée à ses capacités et documenter ce choix dans `ETAT_DU_PROJET.md`.

Si un agent peut accéder au routeur mais ne peut pas lire ou modifier directement les fichiers locaux, il doit signaler cette limitation et demander les fichiers ou les accès nécessaires. Il ne doit jamais prétendre avoir modifié le dossier local s'il ne l'a pas fait.

## 5. Documents communs à consulter

Après le routeur et le fichier de mission, consulter :

- `00_LIRE_EN_PREMIER.md`
- `REGLES_COMMUNES.md`
- `ETAT_DU_PROJET.md`

Consulter ensuite les documents techniques pertinents :

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/scoring.md`
- `docs/network-profiles.md`
- `docs/security.md`
- `docs/DECISIONS.md`
- `docs/HANDOFF_TEMPLATE.md`

Le rapport qualité se trouve dans `docs/QA_REPORT.md`.

Il n'est pas nécessaire de lire tous les documents techniques si certains ne concernent pas la mission.

## 6. Mission 01 — GPT Architecte

Fichier : `agents/01_GPT_ARCHITECTE.md`

Responsabilités :

- Définir l'architecture globale.
- Organiser la structure du projet.
- Définir les responsabilités du frontend, du backend et du moteur d'analyse.
- Définir les contrats entre composants.
- Définir l'API.
- Documenter le scoring et les profils réseau.
- Définir les exigences de sécurité.
- Documenter les décisions techniques.
- Préparer le travail des agents suivants.

L'architecte doit éviter d'implémenter inutilement les fonctionnalités réservées aux autres agents.

À la fin de sa mission, il doit mettre à jour les documents nécessaires et `ETAT_DU_PROJET.md`.

## 7. Mission 02 — Kimi : moteur d'analyse

Fichier : `agents/02_KIMI_MOTEUR_ANALYSE.md`

Responsabilités :

- Implémenter le moteur d'analyse.
- Utiliser Playwright et Chromium si cela correspond à l'architecture retenue.
- Mettre en œuvre la simulation réseau.
- Collecter les ressources et les métriques disponibles.
- Mesurer les performances réelles.
- Retourner des résultats structurés.
- Gérer les erreurs et les délais d'expiration.

Le moteur doit respecter les contrats définis par l'architecture.

**Ne jamais inventer de métriques pour donner l'impression que l'analyse fonctionne.**

Une donnée indisponible doit être représentée conformément au contrat, par exemple avec `null` ou un statut explicite.

## 8. Mission 03 — Codex : backend

Fichier : `agents/03_CODEX_BACKEND.md`

Responsabilités :

- Implémenter le backend Node.js, TypeScript et Express selon l'architecture retenue.
- Développer les endpoints de l'API.
- Valider les requêtes et les URL.
- Intégrer le véritable moteur d'analyse.
- Gérer les erreurs.
- Limiter les ressources et la concurrence.
- Protéger le serveur contre les attaques SSRF.
- Écrire et exécuter les tests backend.

Le backend ne doit pas retourner des données fictives à la place des résultats du moteur réel.

## 9. Mission 04 — Antigravity : frontend

Fichier : `agents/04_ANTIGRAVITY_FRONTEND.md`

Responsabilités :

- Développer l'interface React, Vite, TypeScript et Tailwind CSS selon l'architecture retenue.
- Créer le formulaire d'analyse.
- Permettre la sélection du profil réseau.
- Afficher les états de chargement.
- Afficher les métriques et le score.
- Présenter les recommandations.
- Gérer les erreurs.
- Assurer la responsivité et l'accessibilité.
- Connecter l'interface au backend réellement présent dans le dossier.

Le frontend ne doit pas inventer de résultats pour rendre l'interface plus attractive.

Si des données fictives sont indispensables à un test visuel temporaire, elles doivent être clairement identifiées et ne jamais être présentées comme des mesures réelles.

## 10. Mission 05 — GLM ou Qwen : QA

Fichier : `agents/05_GLM_OU_QWEN_QA.md`

Responsabilités :

- Tester le frontend.
- Tester le backend.
- Tester le moteur d'analyse.
- Vérifier les contrats API.
- Tester la validation des URL.
- Vérifier les protections SSRF.
- Vérifier les métriques et le scoring.
- Contrôler les recommandations.
- Vérifier les erreurs et les délais d'expiration.
- Contrôler l'accessibilité et l'expérience utilisateur.
- Rechercher activement les bugs et les incohérences.

L'objectif est de découvrir les problèmes, et non de confirmer automatiquement que tout fonctionne.

### Rapport QA

Les résultats doivent être documentés dans `docs/QA_REPORT.md`.

Chaque test important doit contenir :

- Un identifiant.
- L'objectif du test.
- Les préconditions et les entrées.
- Le résultat attendu.
- Le résultat réellement observé.
- Le statut du test.
- La gravité du problème, le cas échéant.
- Une recommandation de correction.

Exemple :

```text
TEST : Blocage de localhost

Entrée :
http://127.0.0.1:3000

Résultat attendu :
URL refusée.

Résultat observé :
URL analysée.

Statut :
FAIL

Gravité :
CRITIQUE

Recommandation :
Corriger la protection SSRF et retester les cibles locales.
```

Tout problème critique doit également être signalé dans `ETAT_DU_PROJET.md`.

## 11. Mission 06 — GPT + Codex : livraison finale

Fichier : `agents/06_GPT_CODEX_LIVRAISON.md`

Cette mission intervient après le QA.

Les agents doivent :

1. Lire `ETAT_DU_PROJET.md`.
2. Lire `docs/QA_REPORT.md`.
3. Inspecter le projet complet.
4. Reproduire les problèmes importants identifiés par le QA.
5. Corriger les problèmes nécessaires.
6. Exécuter les tests de régression.
7. Vérifier l'intégration frontend, backend et moteur.
8. Vérifier la sécurité.
9. Vérifier la documentation.
10. Vérifier les instructions d'installation et d'exécution locale.
11. Préparer la version finale.

Aucun problème critique ne doit être ignoré sans justification documentée.

La validation finale doit distinguer les fonctionnalités réellement vérifiées de celles qui restent à tester.

## 12. Inspection obligatoire avant modification

Avant de modifier des fichiers, l'agent doit examiner :

- La structure des dossiers.
- Le code existant.
- Les dépendances.
- Les fichiers de configuration.
- Les scripts disponibles.
- Les tests existants.
- Les documents techniques.
- L'état laissé par les agents précédents.
- Les éventuelles erreurs déjà connues.

Il doit comprendre le rôle d'un fichier avant de le modifier.

**Ne jamais supposer que le projet est vide.**

## 13. Protection du travail existant

Chaque agent doit privilégier les modifications ciblées.

Il ne doit pas :

- Supprimer arbitrairement des fichiers existants.
- Réécrire tout le projet sans justification.
- Remplacer une architecture sans documenter la raison.
- Écraser des modifications récentes sans les examiner.
- Supprimer des tests simplement parce qu'ils échouent.
- Masquer un problème en désactivant une vérification.

Si une modification architecturale importante est nécessaire :

1. Expliquer sa justification.
2. Mettre à jour les documents concernés.
3. Consigner la décision dans `docs/DECISIONS.md`.
4. Mettre à jour `ETAT_DU_PROJET.md`.

Si plusieurs agents interviennent simultanément sur le même dossier, ils doivent se coordonner pour éviter les modifications concurrentes. Le workflow recommandé reste séquentiel.

## 14. Intégrité des données

LowBand Africa doit présenter des résultats issus de mesures réelles ou de calculs explicitement définis.

Ne jamais inventer :

- Un temps de chargement.
- Une taille de page.
- Un nombre de requêtes.
- Un score.
- Une économie de données.
- Une recommandation prétendument fondée sur une mesure inexistante.

Une donnée manquante ne doit pas être transformée automatiquement en zéro.

Respecter le contrat de données pour distinguer les valeurs mesurées, calculées, indisponibles ou estimées.

Les estimations éventuelles doivent être clairement identifiées.

## 15. Sécurité SSRF

L'analyse d'une URL fournie par l'utilisateur peut exposer le serveur à des attaques SSRF.

Tous les agents qui interviennent sur les fonctionnalités concernées doivent respecter `docs/security.md`.

Les protections doivent notamment prendre en compte :

- HTTP et HTTPS uniquement.
- Blocage de localhost.
- Blocage des adresses IP privées et non routables.
- Blocage des endpoints de métadonnées cloud.
- Résolution DNS et validation des adresses obtenues.
- Validation de chaque redirection.
- Risques de DNS rebinding.
- Délais d'expiration.
- Limitation de la taille des réponses.
- Limitation de concurrence.
- Isolation et restrictions du navigateur.

Une simple expression régulière sur l'URL ne constitue pas une protection SSRF suffisante.

Les contrôles doivent être appliqués côté serveur. Le frontend ne remplace jamais ces protections.

## 16. Tests et preuves

Chaque agent doit tester les modifications qu'il réalise lorsque cela est possible.

Il doit distinguer explicitement :

- `TESTÉ` : le test a réellement été exécuté.
- `NON TESTÉ` : le test n'a pas été exécuté.
- `IMPOSSIBLE À TESTER` : une limitation empêche son exécution.

Pour les tests exécutés, préciser les commandes utilisées et les résultats observés.

Ne jamais déclarer qu'une fonctionnalité fonctionne uniquement parce que le code semble correct.

Ne jamais prétendre avoir exécuté une commande, consulté un fichier ou modifié le dossier local si cela n'a pas réellement été fait.

## 17. Mise à jour de ETAT_DU_PROJET.md

À la fin de chaque mission, l'agent doit mettre à jour `ETAT_DU_PROJET.md`.

Il doit renseigner au minimum :

- L'agent intervenu.
- La mission effectuée.
- Le statut.
- Le travail réalisé.
- Les fichiers créés.
- Les fichiers modifiés.
- Les commandes exécutées.
- Les tests et leurs résultats.
- Les problèmes rencontrés.
- Les limitations restantes.
- Les décisions prises.
- La prochaine étape recommandée.

Statuts autorisés :

- `À FAIRE`
- `EN COURS`
- `BLOQUÉ`
- `TERMINÉ AVEC RÉSERVES`
- `TERMINÉ`

Ne pas utiliser `TERMINÉ` si des étapes essentielles de la mission restent inachevées.

## 18. Passage de relais

À la fin de chaque mission, l'agent doit laisser un compte rendu exploitable par l'agent suivant.

Le compte rendu doit répondre aux questions suivantes :

1. Qu'est-ce qui a été réalisé ?
2. Quels fichiers ont été créés ou modifiés ?
3. Qu'est-ce qui fonctionne réellement ?
4. Quels tests ont été exécutés ?
5. Quels tests n'ont pas été exécutés ?
6. Quels problèmes restent ouverts ?
7. Quelles décisions ont été prises ?
8. Quelle est la prochaine étape ?
9. Existe-t-il un blocage empêchant de continuer ?

Utiliser `docs/HANDOFF_TEMPLATE.md` si nécessaire.

`ETAT_DU_PROJET.md` reste la référence centrale pour connaître l'état actuel du travail.

## 19. Coordination locale entre les agents

Les agents ne communiquent pas automatiquement entre eux.

Le transfert du travail s'effectue à travers les fichiers présents dans le dossier local.

Workflow :

```text
Agent 1
   |
   v
Modifie le dossier local
   |
   v
Le responsable vérifie le travail
   |
   v
Agent 2
   |
   v
Modifie le même dossier
   |
   v
Le responsable vérifie le travail
   |
   v
Agent suivant
```

Les documents de coordination sont :

- `ETAT_DU_PROJET.md`
- `docs/DECISIONS.md`
- `docs/QA_REPORT.md`
- `docs/HANDOFF_TEMPLATE.md`

Si un agent travaille dans un environnement isolé qui ne permet pas d'accéder au dossier local commun, le transfert des fichiers doit être effectué explicitement. Il ne doit pas prétendre que ses modifications ont été appliquées au dossier principal tant que cela n'a pas été vérifié.

## 20. Gestion des blocages

Si un agent ne peut pas terminer sa mission :

1. Ne pas masquer le problème.
2. Ne pas déclarer la mission terminée.
3. Documenter précisément le blocage.
4. Mettre à jour `ETAT_DU_PROJET.md`.
5. Expliquer ce qui est nécessaire pour débloquer la situation.
6. Indiquer si les autres agents peuvent continuer malgré ce blocage.

Utiliser `BLOQUÉ` ou `TERMINÉ AVEC RÉSERVES`, selon la situation.

## 21. Problèmes critiques découverts hors mission

Si un agent découvre un problème critique qui ne relève pas directement de sa mission, il doit le signaler.

Exemple :

```text
Agent :
Antigravity — Frontend

Problème découvert :
Le backend semble accepter des adresses IP privées.

Action :
Documenter le problème dans ETAT_DU_PROJET.md et, si approprié,
dans docs/QA_REPORT.md.

Responsable recommandé :
Codex — Backend ou agent de livraison finale.
```

L'agent ne doit pas ignorer un problème critique sous prétexte qu'il appartient à une autre mission.

## 22. Exécution locale du projet

Le projet doit être développé et vérifié en local avant toute décision de déploiement.

Chaque agent doit respecter les scripts et les procédures d'exécution déjà présents dans le projet.

Avant d'ajouter une nouvelle dépendance ou de modifier la configuration :

1. Vérifier les dépendances existantes.
2. Examiner les scripts disponibles.
3. Comprendre les contraintes de l'environnement.
4. Éviter les changements inutiles.
5. Documenter les commandes nécessaires.

Le backend doit pouvoir exécuter le moteur d'analyse réel. Une interface seule ne suffit pas à valider l'application complète.

## 23. Ordre de priorité en cas de contradiction

En cas de contradiction, l'agent doit :

1. Vérifier le code et le comportement réellement observés.
2. Consulter les tests exécutés.
3. Lire les contrats et décisions documentés.
4. Identifier la contradiction.
5. Éviter une modification destructive fondée sur une supposition.
6. Documenter et résoudre la contradiction avec une justification technique.

Si le contrat doit changer, mettre à jour les documents concernés et prévenir les agents dépendants.

## 24. Pipeline complet

```text
AGENT_ROUTER.md
       |
       v
01 — GPT ARCHITECTE
Architecture et contrats
       |
       v
02 — KIMI
Moteur d'analyse
       |
       v
03 — CODEX
Backend Express
       |
       v
04 — ANTIGRAVITY
Frontend React
       |
       v
05 — GLM / QWEN
QA, tests et sécurité
       |
       v
06 — GPT + CODEX
Corrections et validation finale
       |
       v
LOWBAND AFRICA
Version locale validée
```

## 25. Conditions de fin de mission

Une mission peut être déclarée terminée lorsque :

- Le travail demandé a été réalisé autant que possible.
- Les fichiers concernés sont identifiés.
- Les tests pertinents ont été exécutés ou leur absence expliquée.
- Les résultats des tests sont documentés.
- Les limites et problèmes connus sont signalés.
- `ETAT_DU_PROJET.md` est à jour.
- Le prochain agent sait quoi faire.
- Aucun problème connu n'a été volontairement caché.

## 26. Règle finale

Chaque agent doit laisser le projet plus clair, plus stable et mieux documenté qu'il ne l'a trouvé.

Les principes fondamentaux sont :

- Même dossier local.
- Même projet.
- Travail cumulatif.
- Modifications ciblées.
- Tests honnêtes.
- Documentation à jour.
- Passage de relais explicite.
- Aucune fausse validation.

**Le dossier local `LowBand-Africa/` est la source de vérité du projet pendant toute cette phase de développement.**

GitHub, Git et les dépôts distants ne sont pas requis pour ce workflow.