# 04 — Orchestration LLM (MJ, dés, deltas, résumé glissant)

**Dépend de** : `02-character-sheet` (mergée), `03-session-engine`
(mergée — cette tâche remplace l'implémentation stub de `SceneResolverPort`
posée en `03`). C'est la tâche la plus centrale du produit — ne pas
démarrer avant que `02` et `03` soient stabilisées.

## Objectif

Implémenter le vrai `SceneResolverPort` : appeler le LLM (Claude ou
OpenAI selon config) avec le contexte de partie complet, obtenir une
narration + des deltas d'état proposés + gérer les jets de dés pour les
actions mécaniques, et maintenir le résumé glissant de l'historique.

## Périmètre

- `backend/src/domain/` :
  - Port `LlmGameMasterPort` : signature
    `resolveScene(input: SceneResolutionInput): Promise<SceneResolutionOutput>`.
    `SceneResolutionInput` contient : règles du JdR (texte), schéma de
    fiche, état courant de chaque personnage impliqué, les N derniers tours
    en clair, le résumé glissant courant, les actions soumises par chaque
    joueur pour ce tour, et les résultats de dés déjà tirés (voir
    ci-dessous — les dés sont tirés **avant** l'appel LLM, pas par le LLM).
    `SceneResolutionOutput` contient : `narrationText`, une liste de
    `CharacterStateDelta` proposés par personnage (réutiliser le VO de
    `02-character-sheet`), et un `updatedRollingSummary` optionnel (rempli
    seulement quand un cycle de résumé est déclenché).
  - Port `DiceRollerPort` : `roll(formula: string): DiceRollResult` — RNG
    pur, aucune dépendance externe, testable de façon déterministe (seed
    injectable).
- `backend/src/application/` :
  - `ResolveSceneUseCase` (implémente vraiment ce que `03` a stubé) :
    1. Détermine, à partir de `mechanicalActions` du `GameSystem` et des
       actions textuelles soumises, lesquelles déclenchent un jet
       (correspondance simple par mot-clé/action-key choisie par le joueur
       à la soumission — voir note UX ci-dessous) ;
    2. Tire les dés nécessaires via `DiceRollerPort` ;
    3. Appelle `LlmGameMasterPort.resolveScene()` avec les résultats de dés
       déjà connus injectés comme faits ;
    4. Persiste `TurnResolution.narrationText`, stocke les deltas proposés
       dans une nouvelle entité `PendingCharacterDelta` (voir modèle
       ci-dessous) **sans les appliquer**, passe `GameSession.status` à
       `narrating`.
    5. Déclenche `MaintainRollingSummaryUseCase` tous les N tours (N
       configurable, ex: 20).
  - `ValidateCharacterDeltaUseCase` / `RejectCharacterDeltaUseCase` :
    appelées depuis l'UI après revue humaine — valide applique via
    `ApplyCharacterDeltaUseCase` (de `02`), rejette supprime simplement la
    proposition.
  - `MaintainRollingSummaryUseCase` : appelle le LLM (même port, ou une
    méthode dédiée `summarize()`) pour condenser les tours anciens en un
    résumé mis à jour.
- `backend/src/infrastructure/` :
  - `ClaudeGameMasterAdapter` (Anthropic Messages API).
  - `OpenAiGameMasterAdapter`.
  - Sélection de l'adapter actif via `LLM_PROVIDER` (env).
  - `RandomDiceRollerAdapter` (RNG standard, seedable pour les tests).
- `backend/src/interfaces/http/` : endpoints
  `POST /api/sessions/:id/turns/:turnNumber/deltas/:deltaId/validate`,
  `POST /api/sessions/:id/turns/:turnNumber/deltas/:deltaId/reject`.
- `frontend/` : intégration de `{component.dice-roll-chip}` et
  `{component.delta-proposal-card}` dans le flux de `turn-log-entry` posé
  en `03`, avec les actions Valider/Ignorer.

## Modèle de données additionnel

- `PendingCharacterDelta` : `id`, `sessionId`, `turnNumber`, `characterId`,
  `deltaPayload` (JSON — `CharacterStateDelta`), `status: 'pending' |
  'validated' | 'rejected'`, `createdAt`.

## Note UX — comment une action devient "mécanique" ou pas

Pour éviter de faire deviner au LLM si une action nécessite un jet
(fragile), le joueur choisit à la soumission, via une liste déroulante
optionnelle alimentée par `mechanicalActions` du `GameSystem`, "quelle
action mécanique tente mon personnage" (ou "aucune / action libre"). C'est
une donnée explicite envoyée au backend, pas une inférence du LLM — cohérent
avec la fiabilité recherchée en `PRD.md`.

## Détail — prompt engineering (à itérer, pas figé)

- Le prompt système doit imposer un format de sortie structuré exploitable
  (tool calling / JSON mode selon le provider) séparant clairement
  narration et deltas — ne jamais parser la narration en texte libre pour
  en extraire les deltas.
- Toujours injecter les résultats de dés déjà tirés comme des **faits non
  négociables** ("Le jet de Force de Grognak est 17") pour éviter que le
  LLM invente un résultat différent dans sa narration.

## Critères d'acceptation

- Un tour avec 2 joueurs, dont un choisit une action mécanique, produit :
  un jet de dé réel et déterministe en test (RNG mocké), une narration
  cohérente avec ce jet, au moins un `PendingCharacterDelta` en base avec
  `status: 'pending'`.
- Valider un delta l'applique réellement à la fiche (vérifié via
  `02-character-sheet`) ; le rejeter ne modifie rien.
- Le résumé glissant se met à jour après N tours et est bien réinjecté dans
  l'appel suivant (test d'intégration avec adapter LLM mocké, vérifiant le
  contenu du prompt envoyé).
- Swap de `LLM_PROVIDER` de `claude` à `openai` ne casse aucun test — les
  deux adapters implémentent le même port et sont testés avec la même
  suite de contrats (contract testing).

## Hors périmètre

- Génération d'images (c'est `05-world-map`).
- Garde-fous de quota/coût (c'est `08-admin-quotas-cost-guardrails`, qui se
  branche par-dessus `ResolveSceneUseCase`).
- RAG (hors périmètre explicite, voir `PRD.md`).
