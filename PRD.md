# PRD — home-jdr

Application de JdR (jeu de rôle) solo/multijoueur pilotée par un LLM comme
maître du jeu, jouable en famille. Ce document synthétise les décisions
produit issues d'une session de cadrage ; il sert de référence stable pour
toutes les tâches de `tasks/`.

## Pitch

Aujourd'hui, Thomas joue à un JdR via un Projet Claude (règles injectées dans
le contexte de conversation) — mais uniquement seul, en tête-à-tête avec
Claude. `home-jdr` transforme ce fonctionnement en application web
multi-joueurs : plusieurs parties en parallèle, plusieurs JdR au catalogue,
fiche perso qui évolue, carte du monde illustrée, jouable en solo ou à
plusieurs (famille, via des comptes home-auth).

## Périmètre — tout est dans la V1 (pas de découpage MVP/v1/v2)

Décision explicite de l'utilisateur : l'ensemble des fonctionnalités
ci-dessous est développé et livré ensemble, quitte à retarder la première
partie jouable.

## Décisions produit

### Moteur de jeu

- **LLM comme MJ**, via un port générique (`LlmGameMasterPort`), avec au
  moins deux adapters concrets : Claude (Anthropic) et OpenAI. Interchangeable
  par config, pas de couplage dur à un provider.
- **JdR = schéma structuré minimal + règles en texte libre.**
  - Structuré : attributs de fiche perso de base (nom, PV, stats, inventaire),
    liste des actions "mécaniques" qui déclenchent un jet de dés.
  - Texte libre : le PDF de règles du JdR, uploadé par l'admin, extrait une
    fois (pas de re-parsing à chaque appel) et injecté **en entier** dans le
    prompt système à chaque appel LLM (pas de RAG/embeddings en V1 — les PDF
    sont courts).
- **Tour de jeu = soumission groupée.** Chaque joueur d'une partie propose
  son action ; quand tous ont soumis (ou après un timeout configurable), un
  seul appel LLM reçoit toutes les actions et résout la scène collectivement.
  États de partie : `waiting_for_players` → `resolving` → `narrating` (retour
  à `waiting_for_players`).
- **Solo = cas particulier du multi**, même moteur : une partie à 1 joueur
  résout dès que ce joueur soumet (pas d'attente perçue). Aucune branche de
  code séparée pour le solo.
- **Mise à jour de la fiche perso : deltas proposés, validés manuellement.**
  Le LLM répond avec (a) une narration texte et (b) un bloc structuré de
  deltas d'état (tool calling / structured output — ex: `hp: -12`,
  `inventory.add: "épée rouillée"`). Ces deltas sont affichés au joueur/MJ
  comme une proposition, appliqués à la fiche seulement après validation
  (clic). Aucune application automatique.
- **Dés hybrides.** Le schéma structuré du JdR définit quelles actions sont
  "mécaniques" (combat, compétences...) et déclenchent un vrai jet de dés
  (RNG côté serveur, résultat injecté comme fait au LLM, qui doit le
  respecter dans sa narration). Les actions non mécaniques (dialogue,
  exploration libre) restent en narration pure, sans jet.
- **Historique / mémoire longue.** Fenêtre glissante des N derniers tours en
  clair + résumé généré périodiquement par le LLM (ex: tous les 20 tours),
  stocké et réinjecté en plus de la fenêtre récente. Objectif : cohérence
  narrative sur une campagne longue sans faire exploser le coût/latence.

### Personnages

- **1 personnage = 1 partie.** Pas de réutilisation d'un même personnage
  entre plusieurs parties (même JdR). Modèle de données simple : le
  personnage est un enfant direct de la partie.

### Carte du monde

- **Vraie image générée par IA** (même provider que le texte pour commencer,
  ex: DALL·E si OpenAI est le provider LLM actif), pas un graphe de données
  ni une carte 100% procédurale.
- **Placement des lieux/pins manuel**, par le MJ/joueur, par-dessus l'image
  (façon Roll20/Foundry VTT) — pas de placement automatique par le LLM (il
  ne "voit" pas l'image qu'il vient de faire générer).
- **Stockage MinIO** (cohérent avec le pattern Litestream déjà utilisé pour
  SQLite dans les autres projets home-*). Les URLs de génération tierces
  (DALL·E...) ne sont pas garanties dans le temps → téléchargement et
  re-stockage systématique dès la génération.

### Multi-joueurs & comptes

- **Synchro par polling** (pas de WebSocket). Le front interroge l'état de
  partie toutes les quelques secondes tant qu'elle est `waiting_for_players`.
- **Rejoindre une partie : code d'invitation** court, partagé hors-app
  (Discord, SMS...). Pas d'invitation nominative, pas de liste publique de
  parties.
- **Catalogue de JdR géré par un seul admin** (Thomas). Un JdR a un flag
  `adaptedForChildren` ; un compte "enfant" ne peut créer/rejoindre que des
  parties utilisant un JdR flaggé ainsi.
- **Notifications push (PWA + Web Push/VAPID).** Nécessite l'installation de
  l'app en PWA ("Ajouter à l'écran d'accueil") sur les appareils iOS/iPadOS
  des joueurs — contrainte Apple, pas un choix technique. Notification
  envoyée quand une partie passe en attente de l'action d'un joueur, ou
  quand une scène est résolue.

### Coûts & garde-fous

- **Clé API partagée** (Thomas), pas de clé par joueur.
- **Quotas** : limite configurable de résolutions de scène par jour et/ou
  par partie, pour éviter une dérive de coût. Doit être vérifiable/ajustable
  sans redéploiement (config ou table admin).

### Auth & déploiement

- **Auth déléguée à `home-auth`** (OAuth2 Authorization Code flow), même
  pattern que documenté dans `home-budget` : cookies httpOnly
  `access_token`/`refresh_token`, `JwtAuthGuard` via JWKS, webhook de
  déconnexion globale.
- **Repo dédié `home-jdr`**, mono-image Docker (backend NestJS sert le
  build React statique), SQLite + Litestream/MinIO, déploiement SSH depuis
  GitHub Actions avec secrets 1Password — pattern strictement identique à
  `home-budget`.

### Design

- Principes structurels de `design.md` (grille, hiérarchie typographique,
  spacing, philosophie "pas de fioritures") conservés, palette et ton
  visuel adaptés à une identité JdR plutôt que sportswear. Voir `DESIGN.md`
  à la racine de ce kit.
- Mobile-first (usage principal sur iPad/iPhone en famille).

## Hors périmètre explicite (non demandé, à ne pas construire sans validation)

- RAG / embeddings sur les règles (V1 = injection complète du texte extrait).
- Réutilisation d'un personnage entre plusieurs parties.
- Invitations nominatives ou parties publiques.
- Modération de contenu automatisée (le garde-fou est le choix du JdR par
  l'admin, pas un filtre technique).
- WebSocket / temps réel.
- Provider d'image dédié différent du provider LLM (peut venir plus tard).
