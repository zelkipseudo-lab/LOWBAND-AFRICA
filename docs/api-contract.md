# Contrat API — LowBand Africa

Version initiale : v1. Les champs sont en camelCase, les dates en ISO-8601 UTC et les tailles en octets décimaux observés. Le frontend consomme ce contrat; le moteur interne ne constitue pas un deuxième contrat public.

## `POST /api/v1/analyze`

Requête JSON, sans champs supplémentaires :

```json
{"url":"https://example.com/","profile":"slow_3g"}
```

`url`: chaîne absolue HTTP(S), sans identifiants, ports 80 ou 443 uniquement. `profile`: `fast | 4g | 3g | slow_3g`. `unstable` est réservé et rejeté tant que l'émulation reproductible n'est pas implémentée. Taille maximale de requête suggérée : 8 KiB.

### Réponse 200

```json
{
  "analysisId":"uuid",
  "status":"completed",
  "url":"https://example.com/",
  "profile":"slow_3g",
  "startedAt":"2026-10-22T12:00:00.000Z",
  "durationMs":4200,
  "metrics":{
    "navigationMs":3800,"fcpMs":1200,"lcpMs":null,
    "requestCount":24,"transferBytes":320000,"failedRequests":1,
    "resources":{"javascriptBytes":100000,"cssBytes":20000,"imageBytes":150000,"fontBytes":10000,"otherBytes":40000}
  },
  "score":{"value":71,"label":"acceptable","components":{"performance":65,"dataEfficiency":80,"resourceOptimization":60,"resilience":75},"availableWeight":1,"methodologyVersion":"1.0"},
  "recommendations":[{"code":"REVIEW_IMAGES","message":"Les images représentent une part importante des octets transférés.","evidence":{"imageShare":0.47}}],
  "warnings":["LCP indisponible dans cette navigation."]
}
```

Les valeurs de l'exemple sont fictives et ne décrivent pas un résultat réel. `status` vaut `completed` lorsque le moteur termine sa navigation, ou `partial` si le moteur retourne un rapport après expiration de la navigation et marque les mesures partielles dans `warnings`; les échecs moteur renvoient une erreur et ne sont pas historisés. Certaines métriques indisponibles valent `null`; score peut être `null`. Tous les champs montrés sont obligatoires, sauf `score.value` et une composante indisponible qui valent `null`. `warnings` peut être vide. `resources` contient des nombres ou `null` par catégorie; `transferBytes` additionne les octets de transfert réellement observés quand ils sont disponibles.

Un champ métrique absent de la plateforme est `null`, jamais zéro. Pour la réponse v1, les sous-mesures requises sont : `navigationMs` (durée jusqu'à l'événement de navigation documenté par le moteur), FCP/LCP (PerformanceObserver lorsque disponible), requêtes et échecs observés durant la fenêtre de mesure, octets transférés à partir des tailles réseau effectivement exposées par Chromium. Chaque limite connue doit apparaître dans `warnings`. Ne pas assimiler taille encodée/compressée et taille transférée.

Les recommandations ont `code` stable, texte lisible et preuve chiffrée uniquement si calculable. N'émettre aucune recommandation dont les conditions de preuve ne sont pas satisfaites.

## Erreur

```json
{"error":{"code":"BLOCKED_TARGET","message":"Cette cible ne peut pas être analysée.","requestId":"uuid"}}
```

Codes v1 : `INVALID_JSON`, `INVALID_URL`, `UNSUPPORTED_PROTOCOL`, `BLOCKED_TARGET`, `INVALID_PROFILE`, `INVALID_HISTORY_QUERY`, `INVALID_ANALYSIS_ID`, `ANALYSIS_TIMEOUT`, `NAVIGATION_FAILED`, `ANALYSIS_FAILED`, `RATE_LIMITED`, `ANALYSIS_BUSY`, `ENGINE_UNAVAILABLE`, `EGRESS_POLICY_UNVERIFIED`, `HISTORY_UNAVAILABLE`, `INTERNAL_ERROR`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`. Message sûr et générique; aucune trace, IP résolue, chemin local ou détail d'infrastructure.

Statuts : `400` corps/URL/profil/paramètre d'historique invalide; `403` cible bloquée; `404` route ou analyse absente; `405` méthode refusée; `408` échéance; `429` limitation de fréquence; `503` analyse déjà active, politique EGRESS non vérifiée (`EGRESS_POLICY_UNVERIFIED`) ou stockage d'historique indisponible; `502` échec de navigation ou indisponibilité/lancement Chromium (`ENGINE_UNAVAILABLE`); `500` erreur inconnue. `EGRESS_POLICY_UNVERIFIED` désigne l'isolation du runtime backend non confirmée; le visiteur n'a aucune installation à effectuer. Toutes les erreurs suivent la même enveloppe JSON. Les refus de validation, de sécurité, de concurrence et le verrou moteur ne consomment pas le quota de fréquence.

Limites backend v1 : corps maximal 8 KiB; une analyse active à la fois; 10 analyses lancées par adresse cliente sur 10 minutes. Quand le backend est derrière un proxy, `LOWBAND_TRUST_PROXY` doit lister explicitement les adresses ou sous-réseaux de proxies de confiance (séparés par des virgules); ne jamais activer une confiance générale fournie par un client.

## `GET /api/v1/health`

`200 {"status":"ok"}` sans version, chemins, configuration ou détails d'hôte.

## Historique des analyses

Les analyses retournées avec succès par `POST /api/v1/analyze` sont enregistrées automatiquement avant la réponse. Une panne de stockage renvoie `503 HISTORY_UNAVAILABLE` au lieu de présenter le rapport comme livré sans historique. Les analyses échouées ne sont pas stockées. Chaque entrée conserve le rapport API détaillé et ses mesures observées; aucun contenu de page, cookie ni header n'est sauvegardé. Lors de la persistance, les paramètres d'URL dont le nom évoque un secret courant (`token`, `api_key`, `secret`, `password`, `signature`, `auth`, `code`, etc.) et le fragment URL sont retirés de la copie historique.

### `GET /api/v1/history?limit=20&offset=0`

Retourne les plus récentes d'abord. `limit` est un entier de 1 à 100 (défaut 20); `offset` est un entier positif ou nul (défaut 0).

```json
{"items":[{"analysisId":"uuid","status":"completed","url":"https://example.com/","profile":"slow_3g","startedAt":"2026-10-22T12:00:00.000Z","durationMs":4200,"score":{"value":71,"label":"acceptable","components":{},"availableWeight":1,"methodologyVersion":"1.0"}}],"total":1,"limit":20,"offset":0}
```

Les détails de métriques et recommandations sont omis de la liste, disponibles dans le détail. Historique vide: `200 {"items":[],"total":0,"limit":20,"offset":0}`.

### `GET /api/v1/history/{analysisId}`

Renvoie le rapport détaillé stocké (`200`), `404 NOT_FOUND` si l'UUID valide n'existe pas, `400 INVALID_ANALYSIS_ID` si le format UUID est invalide. L'URL peut différer de celle de la réponse d'analyse si des paramètres sensibles ou un fragment ont été retirés.

### `DELETE /api/v1/history/{analysisId}`

Supprime l'entrée et renvoie `204` sans corps; renvoie `404 NOT_FOUND` si elle n'existe pas et `400 INVALID_ANALYSIS_ID` pour un identifiant mal formé.

Les erreurs de stockage sur lecture, écriture ou suppression sont `503 HISTORY_UNAVAILABLE`. Le service n'ayant pas encore d'authentification, l'historique actuel est commun à l'instance API et ne constitue pas un espace privé par utilisateur.

## Opération et compatibilité

Le prototype est synchrone, une analyse par requête, avec timeout global cible de 45 s et limite configurable de concurrence (valeur initiale 1). L'adaptateur actuel persiste en JSON sur le serveur; `LOWBAND_HISTORY_FILE` configure son chemin (par défaut `data/analysis-history.json` sous le répertoire courant). Écriture atomique et sérialisation des modifications protègent les appels concurrents d'un même processus. Cet adaptateur est destiné à une instance unique avec stockage disque persistant; plusieurs processus/réplicas nécessitent un adaptateur partagé (p.ex. SQL), implémentable derrière `AnalysisHistoryStore` sans changer les routes ou l'orchestration. Les limites réelles d'hébergement restent à confirmer. Toute évolution de forme/codes doit mettre à jour frontend, backend, exemples, tests et ce document ensemble.
