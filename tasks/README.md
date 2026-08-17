# Découpage des tâches — home-jdr

Ce dossier découpe le développement en lots pensés pour être attaqués via
`git worktree`, avec une ou plusieurs sessions Claude Code en parallèle
(une par worktree). Chaque fichier est une tâche autonome : objectif,
dépendances, périmètre de fichiers/modules, critères d'acceptation.

## Principe

```
main
 └─ worktree 00-scaffold        (séquentiel, bloquant, à faire seul en premier)
 └─ worktree 01-game-catalog    (parallélisable après 00)
 └─ worktree 02-character-sheet (parallélisable après 00)
 └─ worktree 03-session-engine  (parallélisable après 00, dépend légèrement de 02)
 └─ worktree 04-llm-orchestration (dépend de 02 + 03)
 └─ worktree 05-world-map       (parallélisable après 00, dépend légèrement de 03)
 └─ worktree 06-notifications-push (parallélisable après 00, dépend légèrement de 03)
 └─ worktree 07-frontend-shell-design (parallélisable après 00, transverse)
 └─ worktree 08-admin-quotas-cost-guardrails (dépend de 04)
```

Commandes type pour lancer un lot dans son propre worktree :

```bash
git worktree add ../home-jdr-01-game-catalog -b feat/01-game-catalog
cd ../home-jdr-01-game-catalog
claude
# donner à Claude Code : CLAUDE.md, DESIGN.md, PRD.md, tasks/01-game-catalog.md
```

## Ordre et parallélisation

1. **`00-scaffold-monorepo.md` — obligatoire en premier, séquentiel.** Pose
   le monorepo, le pipeline CI/CD, l'intégration `home-auth`, la structure
   hexagonale vide. Rien d'autre ne peut démarrer avant que cette tâche soit
   mergée sur `main`, car toutes les autres tâches écrivent dans les mêmes
   dossiers `backend/src/{domain,application,infrastructure,interfaces}` et
   `frontend/src/{domain,application,infrastructure,presentation}` créés ici.

2. **Vague parallèle A** (après 00, peuvent tourner en même temps dans des
   worktrees séparés — périmètres de fichiers volontairement disjoints) :
   - `01-game-catalog.md`
   - `02-character-sheet.md`
   - `07-frontend-shell-design.md`

3. **Vague B** (après la vague A, dépendances légères) :
   - `03-session-engine.md` (dépend du schéma de fiche posé en 02)
   - `05-world-map.md` (dépend du modèle de partie posé en 03 — peut démarrer
     en parallèle de 03 si l'entité `Session`/`GameParty` est stubée tôt,
     voir note dans le fichier de tâche)
   - `06-notifications-push.md` (dépend du modèle de partie posé en 03,
     même remarque)

4. **Vague C** :
   - `04-llm-orchestration.md` (dépend de 02 + 03 — c'est la tâche qui relie
     fiche perso, moteur de partie et appel LLM)

5. **Dernier** :
   - `08-admin-quotas-cost-guardrails.md` (dépend de 04, ajoute les
     garde-fous de coût par-dessus l'orchestration LLM déjà posée)

## Règles communes à toutes les tâches

- Toujours lire `CLAUDE.md`, `PRD.md` et `DESIGN.md` avant de commencer.
- Respecter l'architecture hexagonale : ports en `domain/`, implémentations
  en `infrastructure/`, orchestration en `application/`, HTTP en
  `interfaces/http/`.
- TDD via les skills utilisateur déjà disponibles (`tdd-workflow-engine`,
  `tdd-core-patterns`, `tdd-testing-patterns`, `tdd-e2e-patterns`,
  `tdd-integration-patterns`) — les consulter avant d'écrire le premier
  test.
- Chaque tâche se termine par une PR contre `main`, pas de merge direct.
- Si une tâche découvre qu'elle a besoin de modifier un fichier hors de son
  périmètre déclaré (ex: un fichier possédé par une autre tâche en cours),
  s'arrêter et le signaler plutôt que de merger un conflit silencieux.
