# Agent 2 — Kimi : Prototype du moteur d'analyse

## Mission

Créer et tester un prototype du moteur d'analyse réel de LowBand Africa.

Tu travailles principalement sur la mesure technique d'un site à l'aide de Playwright et Chromium. Tu ne dois pas consacrer ton temps à construire toute l'interface utilisateur.

## Avant de commencer

Lire :
- `00_LIRE_EN_PREMIER.md`
- `REGLES_COMMUNES.md`
- `ETAT_DU_PROJET.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/network-profiles.md`
- `docs/security.md`

Vérifier les livrables de GPT et le dépôt réel.

## Tâches prioritaires

1. Vérifier que Node.js et Playwright peuvent fonctionner dans l'environnement.
2. Installer ou documenter les dépendances nécessaires.
3. Créer un prototype minimal ouvrant une URL publique autorisée.
4. Collecter les mesures réellement disponibles.
5. Essayer d'appliquer les paramètres réseau définis dans `docs/network-profiles.md`.
6. Définir les limites des mesures.
7. Gérer les erreurs de navigation et les délais d'attente.
8. Renvoyer les résultats dans le format défini par le contrat API.
9. Écrire des tests ou un script reproductible.
10. Documenter les problèmes de compatibilité.

## Mesures à explorer

Selon les possibilités réelles de l'environnement :
- URL analysée.
- Date et durée de l'analyse.
- Temps de navigation.
- First Contentful Paint (FCP), si la mesure est disponible.
- Largest Contentful Paint (LCP), si la mesure est disponible.
- Nombre de requêtes observées.
- Taille des réponses ou transfert réseau lorsque mesurable.
- Répartition des ressources : JavaScript, CSS, images, polices et autres.
- Échecs de requêtes.
- Erreurs de navigation.
- Ressources bloquées ou ayant expiré.
- Informations utiles sur les conditions réseau appliquées.

Toutes les mesures ne seront pas nécessairement disponibles pour chaque site.

## Conditions réseau

Utiliser les profils définis dans `docs/network-profiles.md`.

Ne pas prétendre reproduire exactement un réseau mobile réel. Documenter les paramètres effectivement appliqués par Playwright ou Chromium.

Ne pas supposer que toutes les métriques de performance sont calculables si le site ne termine pas son chargement.

## Sécurité

Le prototype ne doit pas devenir un outil permettant de scanner des réseaux privés.

Respecter `docs/security.md`. Si la validation complète de la cible est prise en charge par le backend principal, indiquer clairement quelles protections sont supposées être fournies en amont.

Ne jamais contourner les protections pour faciliter les tests.

## Livrables

- Un module de moteur réutilisable.
- Un script ou une commande de test.
- Des résultats de test réellement obtenus.
- Une documentation sur l'installation et l'exécution.
- Une liste des mesures disponibles et de leurs limites.
- Une liste des problèmes connus.

## Critères de validation

- Le prototype peut être exécuté selon les instructions.
- Une URL publique de test peut être analysée.
- Les résultats sont réels et conformes au contrat.
- Les erreurs sont gérées.
- Les paramètres réseau sont documentés.
- Les limites de collecte sont explicites.

## Passage à Codex

Mettre à jour `ETAT_DU_PROJET.md`.

Le prochain agent est Codex.

Sa mission : intégrer le moteur dans le backend, implémenter l'API et ajouter les validations de sécurité, les limites d'exécution et les tests serveur.

Fournir à Codex les instructions exactes pour exécuter le moteur.