import { create } from "zustand";

interface LoginModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

// Drives the floating login modal. The modal opens either from an explicit
// "Log in" button click in the top menu, or from the global 401 handler in
// `lib/api.ts` when an authenticated request comes back as expired /
// invalid mid-session. The store has no `reason` field — the *why* is
// communicated separately via the notifications toast, so the modal itself
// stays focused on the login form.
export const useLoginModalStore = create<LoginModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
