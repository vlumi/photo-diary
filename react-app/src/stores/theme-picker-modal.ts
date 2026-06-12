import { create } from "zustand";

// Theme picker modal opens from the UserMenu — gets the swatch grid
// off the menu's flat surface and into a focused modal (#576). Mirrors
// the other global-modal stores (login, change-password).
interface ThemePickerModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useThemePickerModalStore = create<ThemePickerModalState>(
  (set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
  })
);
