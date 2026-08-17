# 01 — Catalogue de JdR (upload de règles, schéma structuré, flag enfants)

**Dépend de** : `00-scaffold-monorepo` (mergé).
**Parallélisable avec** : `02-character-sheet`, `07-frontend-shell-design`.

## Objectif

Permettre à l'admin (Thomas, seul autorisé — voir `PRD.md`) d'ajouter un JdR
au catalogue : uploader le PDF de règles, définir le schéma minimal de
fiche perso pour ce JdR, définir les actions "mécaniques" qui déclencheront
un jet de dés, et marquer le JdR comme adapté aux enfants ou non.

## Modèle de données (point de départ, à affiner en TDD)

- `GameSystem` (le "JdR") : `id`, `name`, `description`, `adaptedForChildren`
  (bool), `rulesText` (texte extrait du PDF), `rulesSourceFileName`,
  `characterSheetSchema` (JSON — voir ci-dessous), `mechanicalActions`
  (JSON — liste d'actions avec leur type de jet), `createdAt`.
- `characterSheetSchema` (JSON) : liste d'attributs de base communs à tout
  JdR — a minima `name`, `hitPoints` (max + courant), `inventory` (liste
  d'items texte) — plus une liste d'attributs custom définis par le JdR
  (`{ key, label, type: 'number'|'text', default }`), cohérent avec la
  décision "schéma structuré minimal + texte libre" de `PRD.md`.
- `mechanicalActions` (JSON) : liste de `{ actionKey, label, diceFormula
  (ex: "1d20"), relatedStat (optionnel, ex: "strength") }` — consommé plus
  tard par `04-llm-orchestration` pour savoir quand déclencher un jet.

## Périmètre

- `backend/src/domain/` : entité `GameSystem`, port
  `GameSystemRepositoryPort`.
- `backend/src/application/` : use-cases `CreateGameSystemUseCase`,
  `UpdateGameSystemUseCase`, `ListGameSystemsUseCase`,
  `GetGameSystemUseCase` (avec filtre implicite `adaptedForChildren` selon
  le rôle de l'appelant — voir note ci-dessous).
- `backend/src/infrastructure/` : `TypeOrmGameSystemRepository`, extraction
  de texte PDF (utiliser une lib d'extraction texte simple — ex.
  `pdf-parse` — pas d'OCR, pas de RAG/embeddings, conformément à
  `PRD.md`).
- `backend/src/interfaces/http/` : `GameSystemController` avec endpoints
  admin (`POST /api/game-systems` avec upload multipart du PDF,
  `PATCH /api/game-systems/:id`) et endpoint de lecture accessible à tout
  utilisateur authentifié (`GET /api/game-systems`).
- `frontend/` : écran admin "Catalogue de JdR" (liste + formulaire de
  création avec upload de fichier + définition du schéma de fiche via un
  éditeur simple champ-par-champ, pas un éditeur JSON brut) et écran
  joueur "Choisir un JdR" (liste filtrée selon le compte : un compte
  "enfant" ne voit que les JdR `adaptedForChildren: true`).

## Détail — contrôle d'accès admin

- Réutiliser le mécanisme de rôle/claim exposé par `home-auth` s'il existe
  (vérifier `userinfo`/JWT claims disponibles) pour distinguer
  admin/adulte/enfant. Si `home-auth` n'expose pas nativement de notion de
  rôle enfant, la modéliser côté `home-jdr` : table `UserProfile` locale
  (miroir de l'utilisateur home-auth, comme fait `home-budget`) avec un
  champ `role: 'admin' | 'adult' | 'child'`, assignable uniquement par
  l'admin depuis un écran dédié.
- Un seul compte admin en pratique (Thomas) — pas besoin de gestion fine de
  permissions multi-admin.

## Critères d'acceptation

- Upload d'un PDF de règles → texte extrait et stocké, visible en relecture
  admin (pour vérifier que l'extraction n'a pas produit du charabia — pas
  de garantie de qualité d'extraction à ce stade, juste un texte brut
  exploitable).
- Un JdR créé avec `adaptedForChildren: false` n'apparaît pas dans la liste
  retournée à un compte `role: 'child'`.
- Le schéma de fiche est validable côté API (types cohérents, `hitPoints`
  toujours présent) avant sauvegarde.
- Tests d'intégration sur l'endpoint d'upload (fichier valide, fichier trop
  gros, fichier non-PDF rejeté).

## Hors périmètre

- RAG/embeddings sur le texte extrait (voir `PRD.md` — hors périmètre
  explicite).
- Édition collaborative du catalogue par plusieurs utilisateurs.
- Versionning des règles d'un JdR déjà utilisé dans une partie en cours
  (un JdR modifié après coup impacte les parties en cours — accepté comme
  limitation connue pour cette V1, à documenter dans le code).
