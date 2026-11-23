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

| Clé                        | Défaut du code | Effet                                                                                                                                                                                                                                                                                                   |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth-verify-token-claims` | `false`        | `true` : `JwksAccessTokenVerifier` vérifie aussi l'audience (`AUTH_CLIENT_ID`), l'émetteur (origine de `AUTH_SERVICE_URL`) et l'algorithme (`RS256`) des access tokens. `false` : seule la signature est vérifiée (comportement historique). Évalué à chaque vérification, sans bloquer (mémo de 30 s). |

## Structure du repo

Voir `tasks/README.md` pour le découpage du travail en lots et leur ordre de
dépendance.
