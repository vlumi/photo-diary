import { create } from "zustand";

import UserModel, { type User } from "../models/UserModel";
import token from "../lib/token";

// Rehydrate from localStorage at module load — the previous pattern lived
// in App.tsx and called `setUser` during render which conflicted with
// React's render-purity rule. Doing it once at store creation moves the
// side effect out of the render path entirely.
const rehydrate = (): User | undefined => {
  const stored = window.localStorage.getItem("user");
  if (!stored) return undefined;
  try {
    const user = UserModel(JSON.parse(stored));
    if (user) {
      token.setToken(user.token());
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
