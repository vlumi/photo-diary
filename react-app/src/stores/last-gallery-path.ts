import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Tracks two related things:
// 1. `paths` — per-gallery last visited URL, used by the Title bar's
//    Gallery / Statistics switcher to return to where the user left
//    off instead of dropping them at the gallery root. In-memory
//    only; resets on a hard reload.
// 2. `lastGalleryId` — most recent gallery the user visited, used by
//    the no-gallery landing in `Gallery/index.tsx` to send signed-in
//    returning users back where they were instead of the tile picker.
//    Persisted to localStorage so it survives reloads.
interface LastGalleryPathState {
  paths: Record<string, string>;
  lastGalleryId: string | undefined;
  get: (galleryId: string) => string | undefined;
  set: (galleryId: string, path: string) => void;
}

export const useLastGalleryPathStore = create<LastGalleryPathState>()(
  persist(
    (set, get) => ({
      paths: {},
      lastGalleryId: undefined,
      get: (galleryId) => get().paths[galleryId],
      set: (galleryId, path) =>
        set((state) => ({
          paths: { ...state.paths, [galleryId]: path },
          lastGalleryId: galleryId,
        })),
    }),
    {
      name: "photo-diary:last-gallery",
      storage: createJSONStorage(() => localStorage),
      // Only `lastGalleryId` persists. Per-gallery paths stay
      // in-memory by design — the Title bar's return-to-where-you-
      // left semantic should reset between visits, but the
      // last-gallery landing redirect should survive.
      partialize: (state) => ({ lastGalleryId: state.lastGalleryId }),
    }
  )
);
