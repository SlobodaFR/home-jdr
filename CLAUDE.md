# CLAUDE.md — home-jdr

Ce fichier oriente Claude Code sur ce repo. Il complète (ne remplace pas)
`PRD.md` (décisions produit) et `DESIGN.md` (système visuel). Lis les trois
avant toute tâche de fond.

## Contexte

`home-jdr` fait partie de la famille de projets personnels `SlobodaFR`
(`home-auth`, `home-budget`, `home-fit`, `home-qrcode`...). Il en reprend
strictement les conventions d'architecture et d'exploitation. Si un doute
n'est pas tranché ici, la référence de comportement est **`home-budget`**
(repo le plus proche en complexité) — va consulter son code plutôt que de
réinventer un pattern.

## Stack

- **Backend** : NestJS + TypeORM + SQLite (better-sqlite3), architecture
  hexagonale (domain / application / infrastructure / interfaces).
- **Frontend** : React + Vite + TypeScript + Tailwind CSS, même découpage
  hexagonal côté front (domain / application / infrastructure /
  presentation).
- **Monorepo** : npm workspaces (`backend`, `frontend`).
- **Docker** : image unique — le backend Nest sert le build React comme
  assets statiques. Pas de multi-services (contrairement à `home-fit`).
- **Persistance** : SQLite + réplication Litestream vers MinIO. MinIO sert
  aussi au stockage des images de cartes générées.
- **Auth** : déléguée à `home-auth` via OAuth2 Authorization Code flow —
  voir le module d'auth de `home-budget` et le répliquer à l'identique
  (cookies httpOnly, `JwtAuthGuard` + JWKS, webhook de déconnexion globale).
- **Déploiement** : GitHub Actions → SSH sur le VPS perso, secrets via
  1Password CLI (voir `.github/workflows` de `home-budget`), Caddy en reverse
  proxy, sous-domaine `jdr.sloboda.fr`.

## Architecture hexagonale — règles non négociables

- `domain/` : entités, value objects, ports (interfaces) de repository ET de
  services externes (LLM, génération d'image). **Zéro dépendance framework.**
  Un `LlmGameMasterPort` et un `ImageGenerationPort` vivent ici en tant
  qu'interfaces ; leurs implémentations concrètes (Claude, OpenAI, DALL·E...)
  vivent en `infrastructure/`.
- `application/` : use-cases qui orchestrent le domaine. Un use-case = une
  action métier (`SubmitPlayerActionUseCase`, `ResolveSceneUseCase`,
  `GenerateWorldMapUseCase`...). Pas de logique HTTP ici.
- `infrastructure/` : implémentations concrètes des ports — TypeORM,
  adapters LLM (`ClaudeGameMasterAdapter`, `OpenAiGameMasterAdapter`),
  adapter MinIO, adapter génération d'image.
- `interfaces/http/` : controllers, DTOs, modules Nest. Aucune règle métier
  ici — un controller appelle un use-case, point.

Si une tâche te fait écrire de la logique métier dans un controller ou un
appel direct à l'API Anthropic/OpenAI depuis l'application layer, c'est que
tu es en train de violer l'architecture — reviens en arrière.

## Convention Claude Code de ce repo

- **Spec-Driven Development** : chaque fonctionnalité substantielle démarre
  par une spec courte (objectif, use-cases, critères d'acceptation) avant
  code, comme pratiqué sur `home-fit`.
- **Slash commands** réutilisés depuis `home-fit`, à adapter ici si présents
  dans `.claude/commands/` : `new-usecase`, `mutation-report`,
  `design-check`. Si absents de ce kit, les recréer en s'inspirant de
  `home-fit`.
- **TDD** : ce repo utilise les skills utilisateur `tdd-workflow-engine`,
  `tdd-core-patterns`, `tdd-testing-patterns`, `tdd-e2e-patterns`,
  `tdd-integration-patterns` déjà disponibles dans l'environnement Claude
  Code de l'utilisateur — les consulter avant d'écrire des tests, ne pas
  improviser un style de test différent.
- **Tests** : `npm test` lance backend (jest) + frontend (vitest), comme
  `home-budget`.

## Sécurité & argent réel — points d'attention spécifiques à ce projet

Contrairement aux autres apps `home-*`, ce projet déclenche des appels API
payants (LLM texte + génération d'image) à chaque tour de jeu. Toute tâche
touchant à l'orchestration LLM doit respecter strictement :

1. **Jamais d'appel LLM sans vérification de quota au préalable** (voir
   `PRD.md` → Coûts & garde-fous). Le quota se vérifie dans le use-case, pas
   dans l'UI.
2. **Jamais d'application automatique d'un delta d'état** proposé par le LLM
   — il doit toujours transiter par un état "proposé" en attente de
   validation humaine avant d'écrire en base (voir `PRD.md`).
3. **Les clés API (Claude/OpenAI, provider d'image) sont des secrets serveur
   uniquement**, jamais exposées au frontend, jamais loggées.
4. **Idempotence des appels de résolution de scène** : un retry réseau ne
   doit jamais déclencher deux résolutions (et deux appels facturés) pour la
   même soumission de tour.

## Ce qui n'est PAS à faire sans validation explicite

Voir `PRD.md` → "Hors périmètre explicite". En particulier : ne pas
introduire de RAG/vector DB, ne pas ajouter WebSocket à la place du polling,
ne pas permettre la réutilisation d'un personnage entre parties, ne pas
ajouter de modération de contenu automatisée par API tierce.

## Où trouver quoi dans ce kit

- `PRD.md` — le "quoi" et le "pourquoi" produit, décisions déjà tranchées.
- `DESIGN.md` — le système visuel (tokens, composants, layout).
- `tasks/` — le travail découpé en lots pensés pour `git worktree`, avec un
  ordre de dépendance explicite dans `tasks/README.md`. Commence toujours
  par lire ce README avant de piocher une tâche.
