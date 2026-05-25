import { create } from "zustand";

// Remembers the most recent Gallery URL the user was on for each
// gallery id, so the Title bar's Gallery/Statistics switcher can return
// the user to where they left from instead of dropping them at the
// gallery root (which then auto-redirects to the latest month). In-memory
// only — survives soft navigation within the SPA, resets on a hard reload.
interface LastGalleryPathState {
  paths: Record<string, string>;
  get: (galleryId: string) => string | undefined;
  set: (galleryId: string, path: string) => void;
}

export const useLastGalleryPathStore = create<LastGalleryPathState>(
  (set, get) => ({
    paths: {},
    get: (galleryId) => get().paths[galleryId],
    set: (galleryId, path) =>
      set((state) => ({
        paths: { ...state.paths, [galleryId]: path },
      })),
  })
);
