import { create } from "zustand";

interface LoginModalState {
  isOpen: boolean;
  // Optional contextual message shown as a banner inside the modal — used
  // by the global 401 handler to say "your session expired" without
  // depending on the toast strip (which sits visually behind the modal's
  // backdrop). Explicit "Log in" clicks open the modal with no message.
  message: string | undefined;
  open: (message?: string) => void;
  close: () => void;
}

export const useLoginModalStore = create<LoginModalState>((set) => ({
  isOpen: false,
  message: undefined,
  open: (message) => set({ isOpen: true, message }),
  close: () => set({ isOpen: false, message: undefined }),
}));
