import { create } from "zustand";

// Mirrors the other global-modal stores (login, change-password,
// theme picker). Opened from the UserMenu; the modal mints a fresh
// pairing ticket on open and drops it on close.
interface PairingModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const usePairingModalStore = create<PairingModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
