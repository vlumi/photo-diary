import { create } from "zustand";

// Per-map-surface last center/zoom, persisted to localStorage so an iOS
// Safari tab-eviction reload lands the user back on the same view. Not
// hydrated via Zustand's `persist` middleware — writes only fire on
// Leaflet's `moveend`, not on every state change, so direct write on
// save is simpler than reconciling middleware timing.
//
// `contextId` guards against restoring a saved view onto the wrong
// scope. If the surface is now looking at a different gallery / photo
// / calendar slice than when we saved, `getView` returns undefined and
// the caller falls back to the natural initial view (bounds-fit).

const STORAGE_KEY = "map-view";

export interface SavedView {
  lat: number;
  lng: number;
  zoom: number;
  contextId: string;
  savedAt: number;
}

type StoredMap = Record<string, SavedView>;

const readAll = (): StoredMap => {
  if (typeof window === "undefined" || !window.localStorage) return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StoredMap;
  } catch {
    return {};
  }
};

const writeAll = (value: StoredMap): void => {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

interface State {
  views: StoredMap;
  saveView: (surface: string, view: SavedView) => void;
  getView: (surface: string, contextId: string) => SavedView | undefined;
  clearAll: () => void;
}

export const useMapViewStore = create<State>((set, get) => ({
  views: readAll(),
  saveView: (surface, view) => {
    const next = { ...get().views, [surface]: view };
    writeAll(next);
    set({ views: next });
  },
  getView: (surface, contextId) => {
    const v = get().views[surface];
    if (!v || v.contextId !== contextId) return undefined;
    return v;
  },
  clearAll: () => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set({ views: {} });
  },
}));
