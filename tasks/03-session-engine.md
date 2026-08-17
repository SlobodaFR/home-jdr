# 03 — Moteur de partie (sessions, join par code, soumission groupée)

**Dépend de** : `00-scaffold-monorepo` (mergé), `02-character-sheet`
(idéalement mergée — sinon travailler contre l'entité `Character` en état
stub minimal `{ id, sessionId }`).
**Parallélisable avec** : `05-world-map`, `06-notifications-push` une fois
l'entité `GameSession` posée (voir note de coordination ci-dessous).

## Objectif

Construire le cœur du moteur multi-joueurs : création de partie, join par
code d'invitation, cycle de vie d'un tour (soumission groupée →
résolution), polling d'état. **Cette tâche ne fait pas l'appel LLM lui-même**
(voir `04-llm-orchestration`) — elle pose la machine à états et le point
d'extension où l'appel LLM viendra se brancher.

## Modèle de données

- `GameSession` (la "partie") : `id`, `gameSystemId`, `name`,
  `inviteCode` (court, unique, généré à la création),
  `status: 'waiting_for_players' | 'resolving' | 'narrating'`,
  `currentTurnNumber`, `rollingSummary` (texte — rempli par
  `04-llm-orchestration`, stub ici), `createdByUserId`, `createdAt`.
- `SessionPlayer` : `sessionId`, `userId`, `characterId`, `joinedAt` — table
  de jointure partie/joueur/personnage.
- `TurnSubmission` : `id`, `sessionId`, `turnNumber`, `playerId`,
  `actionText`, `submittedAt`. Une ligne par joueur par tour.
- `TurnResolution` : `id`, `sessionId`, `turnNumber`, `narrationText`
  (rempli par `04-llm-orchestration`), `resolvedAt` — stub avec
  `narrationText` vide/placeholder pour cette tâche, à consommer réellement
  par `04`.

## Périmètre

- `backend/src/domain/` : entités `GameSession`, `SessionPlayer`,
  `TurnSubmission`, `TurnResolution`, ports repository associés, et un
  port `SceneResolverPort` (interface **vide de logique** ici — juste la
  signature `resolve(session, submissions): Promise<TurnResolutionResult>`
  — c'est le point d'extension pour `04-llm-orchestration`, qui fournira
  l'implémentation réelle ; ici, fournir une implémentation stub qui
  concatène les actions soumises sans appel LLM, pour pouvoir tester le
  cycle de vie de bout en bout sans dépendance externe).
- `backend/src/application/` : `CreateSessionUseCase`, `JoinSessionUseCase`
  (par code, avec vérification `adaptedForChildren` si le joueur est un
  compte enfant), `SubmitTurnActionUseCase` (ajoute une soumission, passe
  `status` à `resolving` et déclenche `SceneResolverPort.resolve()` **si et
  seulement si** tous les joueurs actifs ont soumis, ou après un timeout —
  timeout hors périmètre de cette tâche, prévoir juste le point
  d'extension), `GetSessionStateUseCase` (pour le polling).
- `backend/src/infrastructure/` : repositories TypeORM, générateur de code
  d'invitation (court, non ambigu — éviter `0/O/1/I`).
- `backend/src/interfaces/http/` : `SessionController`
  (`POST /api/sessions`, `POST /api/sessions/join`,
  `POST /api/sessions/:id/turns`, `GET /api/sessions/:id/state` — ce
  dernier est l'endpoint de polling, doit rester léger).
- `frontend/` : écran "Mes parties" (`{component.game-card}`), écran
  "Rejoindre une partie" (saisie de code, `{component.invite-code-badge}`
  affiché après création pour partage), écran de partie en cours
  (`{component.session-status-pill}`, `{component.action-input}`,
  `{component.turn-log-entry}` en flux, polling toutes les 3-4 secondes tant
  que `status !== 'narrating'` ou tant que l'utilisateur a l'écran ouvert).

## Note de coordination avec 05 et 06

`05-world-map` et `06-notifications-push` ont besoin de l'entité
`GameSession` (au minimum `id`, `status`) pour s'y attacher. Pour permettre
le parallélisme réel, publier tôt (dès que le fichier d'entité est stable,
avant même la fin de cette tâche) la définition de `GameSession` dans
`backend/src/domain/entities/game-session.entity.ts` avec un commit dédié,
pour que les worktrees `05` et `06` puissent baser leur travail dessus sans
attendre le merge complet de `03`.

## Critères d'acceptation

- Un utilisateur peut créer une partie, obtenir un code, et un second
  utilisateur peut la rejoindre avec ce code.
- Un compte `role: 'child'` ne peut pas rejoindre une partie dont le
  `GameSystem` a `adaptedForChildren: false` (rejet explicite, message
  clair).
- Soumission groupée : la résolution (même stub) ne se déclenche qu'une
  fois que tous les `SessionPlayer` actifs de la partie ont soumis leur
  action pour le tour courant — test explicite avec 1 joueur (solo, doit
  résoudre immédiatement) et avec 3 joueurs (doit attendre le 3e avant de
  résoudre).
- `GET /api/sessions/:id/state` répond en un temps constant peu importe la
  taille de l'historique (ne doit pas recharger tout `TurnResolution` à
  chaque poll — paginer ou ne renvoyer que l'état courant + N derniers
  tours).

## Hors périmètre

- L'appel LLM réel (c'est `04-llm-orchestration`, qui remplace
  l'implémentation stub de `SceneResolverPort`).
- Les jets de dés réels (également `04`).
- WebSocket (explicitement hors périmètre, voir `PRD.md`).
