import { create } from "zustand";

import UserModel, { type User } from "../models/UserModel";
import token from "../lib/token";

// Rehydrate from localStorage at module load — the previous pattern lived
// in App.tsx and called `setUser` during render which conflicted with
// React's render-purity rule. Doing it once at store creation moves the
// side effect out of the render path entirely. The `localStorage` guard
// covers test environments and any SSR / non-browser context where
// `window.localStorage` may not be defined when the module first loads.
const rehydrate = (): User | undefined => {
  if (typeof window === "undefined" || !window.localStorage) return undefined;
  const stored = window.localStorage.getItem("user");
  if (!stored) return undefined;
  try {
    const user = UserModel(JSON.parse(stored));
    if (user) {
      token.setTokens(user.token(), user.refreshToken());
      return user;
    }
  } catch {
    // Corrupt JSON — fall through to undefined; user can re-login.
  }
  return undefined;
};

interface UserState {
  user: User | undefined;
  setUser: (user: User | undefined) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: rehydrate(),
  setUser: (user) => set({ user }),
}));
