/**
 * Mirrors `backend/src/interfaces/http/controllers/world-map.controller.ts`
 * response shapes. `imageUrl` is a displayable URL derived from the
 * object-storage key server-side - the frontend never sees (or needs) the
 * raw third-party generation URL (see `tasks/05-world-map.md`).
 */
export interface WorldMap {
  id: string;
  sessionId: string;
  imageUrl: string | null;
  generationPrompt: string;
  createdAt: string;
}

/** Relative coordinates (0-1), captured from click/tap on the rendered image - stays correct at any screen size. */
export interface MapPin {
  id: string;
  worldMapId: string;
  label: string;
  positionX: number;
  positionY: number;
  notes: string;
  createdByUserId: string;
  createdAt: string;
}

export interface WorldMapView {
  worldMap: WorldMap | null;
  pins: MapPin[];
}
