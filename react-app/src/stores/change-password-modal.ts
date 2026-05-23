import { create } from "zustand";

// Mirrors `loginModalStore` — separate so the two modals can be open / closed
// independently. The user-menu dropdown opens this one; nothing automatic
// (unlike the 401 handler that opens the login modal).
interface ChangePasswordModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useChangePasswordModalStore = create<ChangePasswordModalState>(
  (set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
  })
);
