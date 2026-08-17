# 05 — Carte du monde (génération IA + pins manuels)

**Dépend de** : `00-scaffold-monorepo` (mergé), l'entité `GameSession`
publiée tôt par `03-session-engine` (voir note de coordination dans
`03-session-engine.md` — ne pas attendre le merge complet de `03`, juste la
définition de l'entité).
**Parallélisable avec** : `03-session-engine` (une fois l'entité publiée),
`06-notifications-push`.

## Objectif

Permettre de générer une image de carte du monde pour une partie (via le
provider d'image, même provider que le LLM texte pour commencer — voir
`PRD.md`), la stocker sur MinIO, et permettre au MJ/joueur de placer des
pins/lieux manuellement par-dessus.

## Modèle de données

- `WorldMap` : `id`, `sessionId`, `imageStorageKey` (chemin MinIO),
  `generationPrompt` (texte envoyé au générateur d'image, conservé pour
  traçabilité/régénération), `createdAt`.
- `MapPin` : `id`, `worldMapId`, `label`, `positionX`, `positionY`
  (coordonnées relatives 0–1, pas en pixels absolus, pour rester
  responsive), `notes` (texte libre), `createdByUserId`, `createdAt`.

## Périmètre

- `backend/src/domain/` : entités `WorldMap`, `MapPin`, ports
  `WorldMapRepositoryPort`, `MapPinRepositoryPort`, port
  `ImageGenerationPort` (`generate(prompt: string): Promise<Buffer>`),
  port `ObjectStoragePort` (`upload(key, buffer): Promise<string>` —
  générique, pas spécifique MinIO, pour rester substituable).
- `backend/src/application/` : `GenerateWorldMapUseCase` (construit le
  prompt à partir du nom/thème du JdR et d'une description optionnelle
  saisie par l'utilisateur, appelle `ImageGenerationPort`, télécharge et
  stocke immédiatement via `ObjectStoragePort` — ne jamais persister
  l'URL tierce brute, voir `PRD.md`), `AddMapPinUseCase`,
  `UpdateMapPinUseCase`, `RemoveMapPinUseCase`, `GetWorldMapUseCase`.
- `backend/src/infrastructure/` : `OpenAiImageGenerationAdapter` (DALL·E) ou
  équivalent selon le provider actif, `MinioObjectStorageAdapter`.
- `backend/src/interfaces/http/` : `WorldMapController`
  (`POST /api/sessions/:id/world-map` pour générer,
  `GET /api/sessions/:id/world-map`,
  `POST /api/sessions/:id/world-map/pins`,
  `PATCH /api/sessions/:id/world-map/pins/:pinId`,
  `DELETE /api/sessions/:id/world-map/pins/:pinId`).
- `frontend/` : écran carte — image plein cadre (voir `DESIGN.md`, "Zone de
  carte du monde"), pins cliquables/déplaçables
  (`{component.map-pin}`/`-active`), formulaire simple d'ajout de pin
  (clic sur la carte → saisie du label), bouton "Régénérer la carte"
  (admin/MJ de la partie uniquement).

## Détail

- Le placement de pin se fait en coordonnées relatives (0–1) capturées au
  clic/tap sur l'image affichée, pour que le repositionnement reste correct
  quelle que soit la taille d'écran (cohérent avec le mobile-first de
  `DESIGN.md`).
- Prévoir l'upload/téléchargement de l'image générée comme une opération
  asynchrone côté UI (spinner, pas de blocage) — la génération d'image peut
  prendre plusieurs secondes.
- Le prompt de génération doit intégrer le nom et le ton du `GameSystem`
  (accessible via `gameSystemId` de la `GameSession`) pour une cohérence
  visuelle basique, sans sur-ingénierie de prompt à ce stade.

## Critères d'acceptation

- Générer une carte pour une partie stocke bien l'image sur MinIO (vérifié
  par test d'intégration avec un adapter de storage en mémoire/mock) et
  jamais l'URL tierce brute en base.
- Ajouter un pin, le déplacer, le supprimer fonctionnent et sont bien reliés
  à `worldMapId`.
- Un utilisateur qui n'est pas dans la partie (`SessionPlayer`) ne peut pas
  voir/modifier sa carte (contrôle d'accès testé).

## Hors périmètre

- Placement automatique de pins par le LLM (explicitement écarté, voir
  `PRD.md`).
- Fog of war / révélation progressive.
- Plusieurs cartes par partie (une V1 = une carte par session, à faire
  évoluer plus tard si besoin réel).
