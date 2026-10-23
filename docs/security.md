# Sécurité — LowBand Africa

## SSRF et cible

Toutes les vérifications sont côté backend; le frontend ne constitue pas une barrière. Parser avec URL standard fiable, accepter HTTP/HTTPS seulement, rejeter URL mal formée, identifiants intégrés, hôte vide et ports non autorisés. Pour la première version, autoriser seulement ports 80 et 443 (et ports additionnels uniquement si un besoin validé le justifie).

Normaliser l'hôte IDNA, résoudre A et AAAA, rejeter si une adresse résolue est non publique (boucle locale, privée, link-local, réservée, multicast, IPv4-mapped IPv6, ULA IPv6) ou service de métadonnées. Gérer les encodages et représentations IP alternatives par une bibliothèque robuste. Refuser les noms locaux/internes.

Chaque redirection est une nouvelle cible : la valider selon les mêmes règles avant toute connexion. Pour éviter la divergence résolution-validée / résolution-utilisée et DNS rebinding, le meilleur contrôle est une politique de sortie réseau du processus/conteneur qui interdit les plages internes et métadonnées. Si le moteur/navigateur ne permet pas de garantir l'application des contrôles avant connexion ou à chaque redirection, bloquer les redirections ou l'analyse plutôt que prétendre être sûr. Le contrôle DNS applicatif seul ne garantit pas l'adresse effectivement contactée par Chromium.

## Isolation navigateur et ressources

Contexte neuf par analyse, navigation non persistante, fermeture garantie dans `finally`; Chromium sans secrets accessibles, sans privilèges inutiles, fichiers temporaires limités. Ne pas activer `ignoreHTTPSErrors` par défaut, ne pas accepter de script ou paramètres Chromium fournis par l'utilisateur. Désactiver téléchargements et protocoles non HTTP(S) selon capacités du moteur.

Valeurs de départ à rendre configurables et vérifier : timeout total 45 s, navigation 30 s, corps JSON 8 KiB, limite de concurrence 1, délai/coupe-circuit des ressources, limites mémoire/processus au niveau de l'hôte. La taille de page et les requêtes doivent être plafonnées autant que possible. Une limitation applicative des réponses ne remplace pas les limites système.

Appliquer une limitation de fréquence côté backend, surtout si accessible publiquement. Pas de stockage de rapport dans la v1. Annulation client et dépassement d'échéance doivent interrompre la tâche et fermer le navigateur.

Si un reverse proxy est utilisé, configurer `LOWBAND_TRUST_PROXY` avec les seules adresses ou sous-réseaux de confiance, séparés par des virgules. Laisser cette variable vide en accès direct; ne jamais faire confiance à toutes les valeurs `X-Forwarded-For`.

## Erreurs, logs et secrets

Messages publics génériques avec `requestId`; journaliser codes et durées utiles sans cookies, corps, secrets ou contenu de page. Ne pas retourner traces, chemins, adresses internes ou erreurs brutes. Secrets via environnement, jamais dans frontend ou dépôt; fournir `.env.example` sans valeur secrète si configuration nécessaire.

## Tests sécurité avant ouverture publique

Tests non agressifs avec cibles locales contrôlées : URL mal formée, protocole interdit, loopback IPv4/IPv6, plage privée, link-local/métadonnées, DNS qui retourne privé, redirection publique vers privé, changement DNS simulé, ports interdits, timeout, concurrence et arrêt propre. Vérifier le réseau réellement accessible depuis l'environnement Chromium. Aucun test sur un réseau tiers sans autorisation.

Si l'isolation réseau empêchant les accès internes n'est pas présente, ne pas exposer le service comme analyseur public; l'application seule ne peut pas promettre une protection complète contre DNS rebinding et course de redirection.

## Garde de lancement backend

Le navigateur automatisé est exécuté par le backend, jamais installé sur l'appareil du visiteur. Le backend démarre normalement, mais refuse une analyse tant que sa configuration n'indique pas qu'une politique EGRESS protège effectivement le processus Chromium. Sans cette configuration, il renvoie `503 EGRESS_POLICY_UNVERIFIED`; il ne présente pas l'analyse comme réussie.

`LOWBAND_EGRESS_ISOLATION=verified` est une déclaration du processus backend, pas un pare-feu. En production, l'opérateur devra appliquer l'isolation au niveau du runtime/hôte qui exécute le backend et Chromium, puis configurer cette valeur uniquement après validation. Aucun fournisseur ou hébergeur n'est imposé ici. La couche application continue aussi à valider les DNS, les destinations et chaque redirection.

En développement Windows, `scripts/install-chromium-egress-policy.ps1` installe, une fois avec privilèges administrateur, une règle Windows Defender Firewall liée au chemin exact de Chromium fourni par Playwright. Les plages IPv4/IPv6 bloquées sont définies dans `scripts/chromium-egress-policy.psd1` et partagées par l'installation et le prévol.

À chaque démarrage, `scripts/start-backend-with-verified-egress.ps1` vérifie sans privilèges administrateur que le pare-feu est actif, que la règle sortante est activée sur tous les profils, qu'elle vise le binaire Chromium Playwright courant et qu'elle contient exactement la liste de plages attendue. Il lance ensuite `scripts/verify-chromium-egress.mjs`, qui teste que le garde applicatif refuse loopback et que Chromium atteint `https://example.com/`. Le script ne déverrouille le backend que si tous ces contrôles réussissent. Après une mise à jour Playwright/Chromium, réinstaller la règle. `scripts/remove-chromium-egress-policy.ps1` retire uniquement les règles du groupe LowBand Africa.

Le fichier `scripts/Verify-Egress.ps1` mentionné dans certains échanges n'existe pas dans le dépôt; les fichiers réels sont `start-backend-with-verified-egress.ps1` et `verify-chromium-egress.mjs`. L'ancien contrôle de démarrage vérifiait l'accès public et le garde SSRF loopback, mais ne contrôlait pas que la règle pare-feu était toujours active et liée au Chromium courant. Le prévol PowerShell couvre désormais cette vérification de configuration. Le test public est une sonde de disponibilité, pas une analyse produit.
