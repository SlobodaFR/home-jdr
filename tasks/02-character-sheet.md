# 02 — Fiche personnage structurée

**Dépend de** : `00-scaffold-monorepo` (mergé). Consomme le
`characterSheetSchema` défini en `01-game-catalog` — si `01` n'est pas
encore mergée, travailler contre un schéma stub documenté ici (voir
"Contrat d'interface" ci-dessous) pour ne pas bloquer le parallélisme.
**Parallélisable avec** : `01-game-catalog`, `07-frontend-shell-design`.

## Objectif

Modéliser et exposer la fiche personnage : création à partir du schéma d'un
`GameSystem`, affichage, et application des mises à jour (deltas validés —
le mécanisme de proposition/validation lui-même est construit en
`04-llm-orchestration`, cette tâche expose seulement le point d'entrée
"appliquer un delta déjà validé").

## Contrat d'interface (si `01` n'est pas encore mergée)

Travailler contre cette forme minimale de schéma, compatible avec ce que
`01-game-catalog` produira :

```json
{
  "baseAttributes": {
    "hitPoints": { "max": 20 },
    "inventory": []
  },
  "customAttributes": [
    { "key": "strength", "label": "Force", "type": "number", "default": 10 }
  ]
}
```

## Modèle de données

- `Character` : `id`, `gameSystemId`, `sessionId` (une seule partie — voir
  `PRD.md`, "1 personnage = 1 partie"), `ownerUserId`, `name`,
  `hitPointsMax`, `hitPointsCurrent`, `inventory` (JSON liste de strings ou
  d'objets `{ name, quantity }`), `customAttributes` (JSON — valeurs pour
  les attributs définis par le `GameSystem`), `createdAt`, `updatedAt`.

## Périmètre

- `backend/src/domain/` : entité `Character`, port
  `CharacterRepositoryPort`, value object `CharacterStateDelta` (ex:
  `{ hitPoints?: number, inventoryAdd?: string[], inventoryRemove?: string[],
  customAttributeChanges?: Record<string, number|string> }`) — ce VO sera
  réutilisé tel quel par `04-llm-orchestration`, le concevoir avec ça en
  tête.
- `backend/src/application/` : `CreateCharacterUseCase` (valide le nom
  requis + initialise les attributs selon le schéma du `GameSystem` cible),
  `GetCharacterUseCase`, `ApplyCharacterDeltaUseCase` (applique un
  `CharacterStateDelta` déjà validé — ne fait aucune validation métier de
  "est-ce que ce delta est raisonnable", ça reste la responsabilité de
  l'UI/du MJ humain qui valide en amont).
- `backend/src/infrastructure/` : `TypeOrmCharacterRepository`.
- `backend/src/interfaces/http/` : `CharacterController`
  (`POST /api/characters`, `GET /api/characters/:id`,
  `GET /api/sessions/:sessionId/characters`).
- `frontend/` : écran "Créer mon personnage" (formulaire généré depuis le
  schéma du `GameSystem` choisi), écran "Fiche personnage" (affichage avec
  `{component.character-stat-bar}` / `-critical}` pour les PV, liste
  d'inventaire, autres attributs custom).

## Détail

- Le seuil "critique" de `{component.character-stat-bar-critical}` (voir
  `DESIGN.md`) : proposer un défaut simple (≤ 25% des PV max) configurable
  plus tard si besoin, pas de sur-ingénierie ici.
- Le composant de fiche perso frontend doit être conçu pour être réutilisé
  tel quel dans l'écran de partie (`03-session-engine`) en mode compact —
  prévoir une prop/variant `compact` dès cette tâche pour éviter une
  réécriture.

## Critères d'acceptation

- Création d'un personnage à partir d'un `GameSystem` donné initialise
  correctement `hitPointsCurrent = hitPointsMax` et les attributs custom à
  leurs valeurs par défaut.
- `ApplyCharacterDeltaUseCase` applique correctement un delta partiel (ex:
  seulement `hitPoints: -5`, sans toucher à l'inventaire) et clippe
  `hitPointsCurrent` entre 0 et `hitPointsMax`.
- Tests unitaires sur le VO `CharacterStateDelta` (application idempotente,
  pas d'effet de bord si delta vide).

## Hors périmètre

- Le mécanisme de proposition de delta par le LLM (c'est
  `04-llm-orchestration`) — cette tâche ne fait qu'exposer l'application
  d'un delta déjà décidé.
- Réutilisation d'un personnage entre parties (explicitement hors
  périmètre, voir `PRD.md`).
