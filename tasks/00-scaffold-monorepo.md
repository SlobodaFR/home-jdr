# 00 — Scaffold monorepo & déploiement

**Statut de dépendance** : aucune. Doit être fait en premier, en
séquentiel, avant toute autre tâche.

## Objectif

Poser le squelette du repo `home-jdr` avec exactement le même pattern que
`home-budget` (stack, architecture, CI/CD, auth), prêt à recevoir les
fonctionnalités des tâches suivantes.

## Référence à explorer avant de coder

Cloner ou consulter en lecture `SlobodaFR/home-budget` (et si besoin
`SlobodaFR/home-auth` pour le détail du contrat OAuth2/JWKS) et répliquer
strictement :
- La structure npm workspaces (`backend`, `frontend`).
- La configuration Dockerfile mono-image (Nest sert le build React statique).
- Le module d'authentification (`AuthModule`, `JwtAuthGuard`, endpoints
  `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`,
  `/api/auth/disconnect`), adapté au nom du service (`home-jdr` au lieu de
  `home-budget`) mais avec un comportement identique.
- Le `.github/workflows` de déploiement SSH + 1Password CLI.
- La config Litestream/MinIO pour la réplication SQLite (les variables
  d'env `MINIO_*` de `home-budget`).

## Périmètre

- Racine du repo : `package.json`, `.nvmrc`, `.gitignore`, `.dockerignore`,
  `Dockerfile`, `README.md`.
- `backend/` : squelette NestJS avec les dossiers vides (mais avec un
  fichier `.gitkeep` ou un exemple minimal) `src/domain`,
  `src/application`, `src/infrastructure`, `src/interfaces/http`, plus le
  module d'auth complet et fonctionnel.
- `frontend/` : squelette Vite + React + TypeScript + Tailwind, dossiers
  `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`,
  intégration du flow OAuth2 (redirection login, gestion de session via
  cookies httpOnly, écran "connecté en tant que...").
- `.github/workflows/deploy.yml` (ou équivalent) répliquant le pipeline SSH
  + 1Password de `home-budget`.
- `docker-compose` ou doc de dev local (`npm run dev:backend`,
  `npm run dev:frontend`) comme dans `home-budget`.

## Détail

- Nom de sous-domaine cible : `jdr.sloboda.fr` (à adapter dans la config
  Caddy déployée sur le VPS, hors périmètre de ce repo mais à documenter
  dans le README).
- Variables d'environnement backend à prévoir dès ce stade (même si non
  toutes consommées avant les tâches suivantes) : `AUTH_SERVICE_URL`,
  `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_WEBHOOK_SECRET`,
  `FRONTEND_URL`, `DATABASE_PATH`, `NODE_ENV`, `PORT`, `MINIO_ENDPOINT`,
  `MINIO_BUCKET`, `MINIO_REPLICA_PATH`, `MINIO_REGION`,
  `MINIO_ACCESS_KEY_ID`, `MINIO_SECRET_ACCESS_KEY` — laisser des
  placeholders pour celles qui seront utilisées par les tâches suivantes
  (`LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `IMAGE_PROVIDER`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `DAILY_LLM_QUOTA`) dans `backend/.env.example` avec un commentaire
  "utilisé à partir de la tâche 0X".
- Mettre en place le premier slash command Claude Code `new-usecase`
  (repris/adapté de `home-fit`) pour que les tâches suivantes puissent
  générer un squelette de use-case cohérent (fichier domain/port +
  application/use-case + test) sans le réécrire à chaque fois.
- Créer `.claude/commands/` avec ce premier command si absent.

## Critères d'acceptation

- `npm install && npm run dev:backend` et `npm run dev:frontend` démarrent
  sans erreur en local.
- Login via `home-auth` fonctionne de bout en bout en environnement de dev
  (ou a minima un mock d'auth-service documenté si `home-auth` n'est pas
  disponible en local — documenter le choix).
- `docker build` produit une image unique qui sert le frontend buildé sur
  `/` et le backend sur `/api`.
- Le pipeline GitHub Actions se déclenche sur push vers `main` (peut être
  testé en dry-run / vérifié structurellement sans déploiement réel si le
  VPS n'est pas accessible depuis l'environnement de la tâche).
- `npm test` tourne (même avec une suite de tests minimale à ce stade) et
  passe en CI.

## Hors périmètre

- Toute logique métier de JdR (catalogue, fiche, partie, LLM) — c'est
  l'objet des tâches suivantes.
- Configuration Caddy réelle sur le VPS (documentation seulement).
