# Agent 6 — GPT et Codex : Intégration finale et livraison

## Mission

Stabiliser le produit, corriger les défauts prioritaires et préparer une livraison vérifiable de LowBand Africa.

## Avant de commencer

Lire :
- `00_LIRE_EN_PREMIER.md`
- `REGLES_COMMUNES.md`
- `ETAT_DU_PROJET.md`
- `docs/QA_REPORT.md`
- `docs/DECISIONS.md`
- Toute la documentation technique utile.

Examiner le dépôt et les résultats du rapport QA.

## Tâches

1. Corriger les défauts P0.
2. Corriger les défauts P1 réalisables dans le délai.
3. Vérifier la compatibilité frontend/backend.
4. Exécuter le build de production.
5. Exécuter les tests essentiels.
6. Vérifier la configuration des variables d'environnement.
7. Vérifier les commandes de lancement.
8. Préparer la configuration d'hébergement.
9. Déployer si les accès et l'infrastructure le permettent.
10. Vérifier réellement la version déployée.
11. Documenter les limites restantes.
12. Mettre à jour le README et le fichier d'état.

## Déploiement

Le backend doit pouvoir exécuter Playwright et Chromium.

Avant de choisir l'hébergeur, vérifier :
- La disponibilité de Node.js.
- La possibilité d'installer et d'exécuter Chromium.
- La mémoire et le processeur disponibles.
- Les limites de temps d'exécution.
- Les ports et les variables d'environnement.
- Les restrictions de réseau sortant.
- Les règles de stockage temporaire.

Ne pas présenter un déploiement comme réussi tant qu'une vérification concrète n'a pas été effectuée.

## Vérifications finales

- Installation reproductible.
- Build frontend réussi.
- Backend fonctionnel.
- Analyse réelle d'une URL publique autorisée.
- Score calculé correctement.
- Gestion des erreurs.
- Sécurité SSRF vérifiée par les tests disponibles.
- Absence de secrets commis.
- Documentation actualisée.
- Rapport QA pris en compte.

## Livrables

- Version stabilisée du code.
- README d'installation.
- Guide de configuration.
- Rapport final de tests.
- URL de production, si le déploiement a réussi.
- Liste des limites connues.
- `ETAT_DU_PROJET.md` mis à jour.

## Verdict final

Choisir un statut honnête :
- LIVRÉ ET VÉRIFIÉ
- LIVRÉ AVEC RÉSERVES
- NON LIVRABLE DANS L'ÉTAT

Expliquer brièvement pourquoi.

Une version locale fonctionnelle n'est pas automatiquement une version déployée fonctionnelle.
