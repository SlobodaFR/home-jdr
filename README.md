# home-jdr

Application de JdR (jeu de rôle) piloté par un LLM comme maître du jeu,
jouable en solo ou à plusieurs (famille) via des comptes `home-auth`.
Voir `PRD.md` pour les décisions produit et `DESIGN.md` pour le système
visuel.

## Stack

- **Backend** : NestJS + TypeORM + SQLite (`better-sqlite3`), architecture
  hexagonale (`domain` / `application` / `infrastructure` / `interfaces`).
- **Frontend** : React + Vite + TypeScript + Tailwind CSS, même découpage
  hexagonal côté front.
- **Monorepo** : npm workspaces (`backend`, `frontend`).
- **Docker** : image unique — le backend sert le build React comme assets
  statiques (`/`) et expose l'API sous `/api`.
- **Persistance** : SQLite répliqué en continu vers MinIO via Litestream.
- **Auth** : déléguée à `home-auth` via OAuth2 Authorization Code flow
  (cookies httpOnly, `JwtAuthGuard` + JWKS, webhook de déconnexion globale).

## Développement local

```bash
npm install
cp backend/.env.example backend/.env   # complétez les valeurs
npm run dev:backend     # http://localhost:3000 (API sous /api)
npm run dev:frontend    # http://localhost:5173 (proxy /api -> :3000)
```

### Authentification en local

`AUTH_SERVICE_URL` doit pointer vers une instance de `home-auth` accessible
(locale ou distante) exposant le flow OAuth2 Authorization Code et un
endpoint JWKS (`/.well-known/jwks.json`). Sans `home-auth` disponible en
local, le flow de login redirige mais échoue à l'échange de code — dans ce
cas, documentez ici tout mock utilisé pour débloquer le développement d'une
tâche donnée plutôt que d'improviser un contournement silencieux.

### Tests

```bash
npm test   # backend + frontend (Vitest)
npm run lint           # Oxlint (type-aware)
npm run format:check   # Oxfmt (`npm run format` pour corriger)
npm run typecheck      # tsc backend + frontend
```

## Build & Docker

```bash
npm run build              # build frontend puis backend (copie dist/ frontend dans backend/dist/public)
docker build -t home-jdr .
```

L'image unique sert le frontend buildé sur `/` et l'API sur `/api`.

## Déploiement

- CI : `.github/workflows/ci.yml` (lint, format, type-check, tests, build, vérif
  build Docker sur PR).
- Publication d'image : `.github/workflows/build-and-publish.yml` (push sur
  `main` ou release → GHCR).
- Déploiement VPS : `.github/workflows/deploy-vps.yml`, déclenché après
  publication réussie — secrets chargés via 1Password CLI, SSH vers le VPS,
  `docker compose` + Caddy en reverse proxy.
- Sous-domaine cible : `jdr.sloboda.fr` (config Caddy dans `deploy/Caddyfile`,
  déployée sur le VPS par `deploy/scripts/update-vps.sh` — la configuration
  Caddy réelle sur le VPS est hors périmètre de ce repo).

## Variables d'environnement backend

Voir `backend/.env.example`. Les variables liées au LLM, à la génération
d'image, aux notifications push et aux quotas admin sont prévues dès ce
stade avec des placeholders — elles seront consommées par les tâches
`tasks/04-llm-orchestration.md`, `05-world-map.md`, `06-notifications-push.md`
et `08-admin-quotas-cost-guardrails.md`.

### Télémétrie opérationnelle (PostHog)

| Variable          | Rôle                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| `POSTHOG_API_KEY` | Clé du projet PostHog. Absente : aucun envoi (le démarrage n'en dépend jamais). |
| `POSTHOG_HOST`    | Hôte PostHog, défaut `https://eu.i.posthog.com`.                                |

Deux événements anonymes (aucun utilisateur, IP ni URL brute) : `runtime_health` (une fois par
minute : latence de la boucle d'événements, ELU, mémoire) et `http_request` (méthode, template de
route, statut, durée ; `/healthz` et le polling `/api/sessions/:id/state` sont exclus). En
production, `POSTHOG_API_KEY` vient du champ 1Password partagé via `deploy-vps.yml`.

### Notifications push (clés VAPID)

`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (`backend/.env.example`) sont la paire
de clés Web Push (voir `tasks/06-notifications-push.md` et `WebPushAdapter`).
La clé publique est envoyée telle quelle au navigateur (`GET
/api/push-subscriptions/vapid-public-key`) ; la clé privée ne doit **jamais**
quitter le serveur.

Pour (re)générer une paire, une seule fois :

```bash
npx web-push generate-vapid-keys
```

En local, collez les deux valeurs dans `backend/.env`. Pour la production,
stockez-les dans le même item 1Password que les autres secrets du projet
(`TECH/thomassloboda_home_secrets`, voir `.github/workflows/deploy-vps.yml`)
sous des champs `JDR_VAPID_PUBLIC_KEY`/`JDR_VAPID_PRIVATE_KEY`, puis
ajoutez-les à l'étape "Load secrets from 1Password" de ce workflow
(`VAPID_PUBLIC_KEY: op://TECH/thomassloboda_home_secrets/JDR_VAPID_PUBLIC_KEY`,
même schéma que `AUTH_CLIENT_SECRET`) ainsi qu'à la liste `envs:` de l'étape
d'écriture du `.env` distant — non fait dans cette tâche pour rester dans son
périmètre déclaré (voir `tasks/README.md` — signaler plutôt que modifier un
fichier hors périmètre), à faire par la session qui merge/déploie.

## Webhook de déconnexion signé (double acceptation)

`POST /api/auth/disconnect` est le `logoutWebhookUrl` enregistré auprès de home-auth
(`{ "userId": "..." }`) : appelé lors d'un logout global, il marque l'utilisateur comme révoqué ; tout
access token émis avant cet instant est ensuite rejeté par `JwtAuthGuard`. Il est authentifié par la
**signature** de home-auth (contrat PC7) ou, pendant la transition, par l'ancien `?secret=AUTH_WEBHOOK_SECRET`.

En-têtes envoyés par home-auth : `X-Auth-Webhook-Id` (uuid v4), `X-Auth-Webhook-Timestamp` (secondes unix),
`X-Auth-Webhook-Signature: v1=<hex>[,v1=<hex>]` avec
`hex = HMAC-SHA256(secret, id + "." + timestamp + "." + rawBody)` ; la clé est la chaîne du secret
(64 caractères hexadécimaux, en UTF-8, pas ses octets décodés) et `rawBody` les octets reçus.

Vérification (`backend/src/domain/auth/webhook-signature.ts`) :

1. un `id` déjà accepté dans les 10 dernières minutes est un **rejeu**, même si les autres en-têtes sont absents ou mal formés (mémoire du processus : un
   redémarrage l'oublie ; seul un `id` dont la signature est entièrement valide est retenu) : 401, même
   avec un `?secret=` valide ;
2. `|now - timestamp| <= 120 s` ;
3. chaque entrée `v1=` est décodée (hex, 32 octets) puis comparée au HMAC recalculé par `timingSafeEqual` ;
   une entrée qui correspond suffit (deux entrées pendant le recouvrement de 24 h après une régénération du
   secret).

Le vérificateur renvoie `ok`, `replay`, `format`, `window` ou `hmac`.

`rawBody` : `main.ts` crée l'application avec `rawBody: true` (`nestApplicationOptions`, partagé avec les
tests) ; `req.rawBody` contient les octets exacts du corps JSON.

Double acceptation (`AuthenticateLogoutWebhookUseCase`) : « en-têtes de signature présents » = au moins un
des trois en-têtes `X-Auth-Webhook-*` non vide.

- Sans aucun en-tête : ancien `?secret=` comparé en `timingSafeEqual`, tant que le flag
  `auth-webhook-require-signature` vaut `false`.
- En-têtes présents et signature valide : accepté (INFO).
- En-têtes présents et `id` déjà vu : 401, même avec un `?secret=` valide (contrôlé avant le repli).
- En-têtes présents mais invalides (`format`, `window`, `hmac`) ou invérifiables (pas de secret de
  signature, corps brut indisponible) : repli sur le `?secret=`, tant que le flag vaut `false`.
- Flag à `true` : signature obligatoire, le `?secret=` n'est plus accepté ; sans
  `AUTH_WEBHOOK_SIGNING_SECRET` configuré, plus rien n'est accepté (échec fermé : ne pas activer le flag
  avant d'avoir le secret).

Journalisation, sans jamais écrire secret, signature ni identifiant, une ligne par raison toutes les
5 minutes : INFO pour une acceptation par signature ; WARN pour une acceptation par l'ancien `?secret=`,
avec la raison `no-signature-headers`, `missing-signing-secret`, `format`, `window`, `hmac` ou
`raw-body-unavailable`. C'est ce qui permet de vérifier la bascule avant d'activer le flag.

`AUTH_WEBHOOK_SIGNING_SECRET` (optionnel, exactement 64 hexadécimaux **en minuscules**, sans espace,
1Password : `JDR_AUTH_WEBHOOK_SIGNING_SECRET`) est le secret affiché une seule fois par l'admin de home-auth
(« Régénérer »). Absent ou vide : seul l'ancien chemin existe. Mal formé (majuscules, espaces, mauvaise
longueur) : le service refuse de démarrer, y compris hors production.

Vecteurs de test fixes du contrat (publiés par home-auth, recopiés dans
`backend/src/domain/auth/webhook-signature.spec.ts`) :

|     | secret | id                                     | timestamp    | corps                 | HMAC (hex)                                                         |
| --- | ------ | -------------------------------------- | ------------ | --------------------- | ------------------------------------------------------------------ |
| 1   | `S1`   | `3b241101-e2bb-4255-8caf-4136c566a962` | `1700000000` | `{"userId":"u1"}`     | `41294c53497c1d18871786b2d5c3ec091e6b357638e7104d826de50af8813242` |
| 2   | `S2`   | `3b241101-e2bb-4255-8caf-4136c566a962` | `1700000000` | `{"userId":"u1"}`     | `89de6c4652b33d864427b3091771ed8b9266a99b3bf915b126eb4655a2dce09f` |
| 3   | `S1`   | `9b2f0f6e-8d3a-4f6b-9c1e-2a7d5e4c1b30` | `1700000123` | `{"userId":"4b8f-é"}` | `d9a2c8cec34058ebb100f8b454ba46b1214cf777000d9aab00dda91205d5a3ac` |

- `S1` = `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`
- `S2` = `ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100`
- Recoupement : `printf '%s' '3b241101-e2bb-4255-8caf-4136c566a962.1700000000.{"userId":"u1"}' | openssl dgst -sha256 -hmac <S1>`

## Feature flags (home-features)

Le service lit des flags booléens dans [home-features](https://features.sloboda.fr) via OFREP
(`@openfeature/server-sdk` + `@openfeature/ofrep-provider`), derrière le port
`FeatureFlags.isEnabled(key, codeDefault)` (`backend/src/domain/shared/feature-flags.ts`). L'adaptateur
(`backend/src/infrastructure/feature-flags/openfeature-feature-flags.ts`) ne contient rien de propre à
home-jdr : c'est la copie de celui de home-auth, que tous les services home-* recopient tel quel.

- **Configuration** : `FEATURES_OFREP_URL` (base `https://features.sloboda.fr/api`, https obligatoire
  en production) et `FEATURES_API_KEY` (clé serveur liée à l'app et à l'environnement, format
  `hf_` + 64 hex ; 1Password : `FEATURES_OFREP_URL` partagé, `JDR_FEATURES_API_KEY`). Absentes :
  tous les flags valent le défaut du code (warning unique) ; invalides : idem, avec une erreur au
  démarrage. Le démarrage n'attend jamais home-features.
- **Évaluation** : délai de 500 ms par requête ; résultat mémorisé 30 s par clé. Valeur définie pour
  l'environnement : cette valeur ; pas de valeur (`DISABLED`) ou flag inconnu (`FLAG_NOT_FOUND`) :
  défaut du code ; autre erreur (réseau, délai, 401, 429, 5xx) : dernière valeur connue, sinon défaut
  du code, mémorisé 30 s aussi, avec un warn au plus toutes les 5 min par flag et code d'erreur. La
  dernière valeur connue est propre au processus : perdue au redémarrage.
- **Pin d'urgence** : `FEATURES_PIN_<CLE_EN_MAJ_SNAKE>=true|false` (ex.
  `FEATURES_PIN_AUTH_VERIFY_TOKEN_CLAIMS=false`) l'emporte sur tout, y compris sans home-features. Toute
  autre valeur est ignorée (erreur loguée). Nécessite un redémarrage du conteneur. Tout caractère hors
  `[A-Za-z0-9]` devient `_`.
- `OFREP_ENDPOINT`, `OFREP_HEADERS` et `OFREP_TIMEOUT_MS`, que le provider lirait sinon, sont ignorés
  et retirés de l'environnement au démarrage (warn).

### Flags utilisés

| Clé                              | Défaut du code | Effet                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth-verify-token-claims`       | `false`        | `true` : `JwksAccessTokenVerifier` vérifie aussi l'audience (`AUTH_CLIENT_ID`), l'émetteur (origine de `AUTH_SERVICE_URL`) et l'algorithme (`RS256`) des access tokens. `false` : seule la signature est vérifiée (comportement historique). Évalué à chaque vérification, sans bloquer (mémo de 30 s). |
| `auth-webhook-require-signature` | `false`        | `true` : `POST /api/auth/disconnect` n'accepte plus que la signature `X-Auth-Webhook-*` (l'ancien `?secret=` est refusé). `false` : signature valide ou ancien `?secret=`.                                                                                                                              |
| `auth-rp-initiated-logout`       | `false`        | `true` : `POST /api/auth/logout` renvoie `{ redirect_to }` (URL de déconnexion de home-auth, PC10) que la SPA ouvre par navigation de premier niveau. `false` : déconnexion locale seule (`redirect_to: null`). Flag propre à jdr, distinct de celui de home-auth.                                      |

### Déconnexion initiée par le service (PC10)

Derrière `auth-rp-initiated-logout`. `POST /api/auth/logout` (même origine, `SameOriginGuard`) efface
toujours `access_token` et `refresh_token` (home-auth ne révoque rien), puis, flag actif, pose le cookie
`logout_state` (httpOnly, `SameSite=Lax`, `Path=/api/auth`, 10 min, `Secure` en production) et renvoie
`{ redirect_to }` = `GET <AUTH_SERVICE_URL>/logout?client_id&post_logout_redirect_uri&state[&access_token_hint]`.
Le hint est l'access token du cookie s'il est valide, sinon un access token obtenu par refresh (3 s max ;
échec = pas de hint, donc écran de confirmation de home-auth, jamais un signal de déconnexion). Le
`post_logout_redirect_uri` est `FRONTEND_URL/api/auth/logged-out` (même origine que la redirectUri
enregistrée). `GET /api/auth/logged-out?state=` compare le `state` au cookie (état absent, répété ou
différent : `/login` sans bandeau), efface le cookie et redirige vers `/login?logged_out=1` (bandeau
« Vous avez été déconnecté. », jamais d'`/authorize` automatique). Réponses en `Cache-Control: no-store`.

Ordre d'activation : activer d'abord le flag dans home-auth, puis celui de jdr. Retour arrière : désactiver
jdr d'abord (ou `FEATURES_PIN_AUTH_RP_INITIATED_LOGOUT=false` + redémarrage). Jdr actif alors que home-auth
est inactif : l'utilisateur est déconnecté de jdr puis arrive sur un `404` JSON de home-auth.

## Structure du repo

Voir `tasks/README.md` pour le découpage du travail en lots et leur ordre de
dépendance.
