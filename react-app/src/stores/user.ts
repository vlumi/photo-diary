import { create } from "zustand";

import UserModel, { type User } from "../models/UserModel";
import token from "../lib/token";

// Rehydrate from localStorage at module load. The legacy SPA stored
// access + refresh tokens inside this blob; new SPAs only persist
// display state (id, isAdmin, editorGalleries) and let HttpOnly
// cookies handle the credential. The legacy fields are silently
// stripped so the user keeps their stored identity across the cutover
// — the next 401 + refresh dance promotes the legacy token to cookies
// and clears the localStorage residue. The localStorage guard covers
// test environments and any SSR / non-browser context where
// `window.localStorage` may not be defined when the module first loads.
const rehydrate = (): User | undefined => {
  if (typeof window === "undefined" || !window.localStorage) return undefined;
  const stored = window.localStorage.getItem("user");
  if (!stored) return undefined;
  try {
    // UserModel ignores any legacy token / refreshToken fields, so this
    // works without explicit stripping.
    const user = UserModel(JSON.parse(stored));
    return user;
  } catch {
    // Corrupt JSON — fall through to undefined; user can re-login.
    token.stripLegacyTokens();
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
