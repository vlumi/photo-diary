import { create } from "zustand";

import UserModel, { type User } from "../models/UserModel";

// Rehydrate from localStorage at module load. Only display state
// (id, isAdmin, editorGalleries) lives here — auth itself is the
// HttpOnly `pd_access` / `pd_refresh` cookies. The localStorage
// guard covers test environments and any SSR / non-browser context
// where `window.localStorage` may not be defined when the module
// first loads.
const rehydrate = (): User | undefined => {
  if (typeof window === "undefined" || !window.localStorage) return undefined;
  const stored = window.localStorage.getItem("user");
  if (!stored) return undefined;
  try {
    return UserModel(JSON.parse(stored));
  } catch {
    // Corrupt JSON — fall through to undefined; user can re-login.
    return undefined;
  }
};

interface UserState {
  user: User | undefined;
  setUser: (user: User | undefined) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: rehydrate(),
  setUser: (user) => set({ user }),
}));

// Cross-tab sync: when another tab logs in / out / refreshes, the
// shared localStorage["user"] entry changes but Zustand stays
// frozen at its initial rehydrate. Without this, Tab A keeps
// showing user A's identity even though the cookie has been
// replaced with B's — and admin pages then fail with the generic
// 403 the user has no path to recover from short of re-login.
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("storage", (e) => {
    if (e.key !== "user" || e.storageArea !== window.localStorage) return;
    if (e.newValue === null) {
      useUserStore.getState().setUser(undefined);
      return;
    }
    try {
      useUserStore.getState().setUser(UserModel(JSON.parse(e.newValue)));
    } catch {
      // Other tab wrote garbage — leave this tab's user as-is.
    }
  });
}
