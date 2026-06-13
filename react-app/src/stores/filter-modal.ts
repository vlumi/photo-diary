import { create } from "zustand";

interface FilterModalState {
  isOpen: boolean;
  // `${topic}:${category}` of the card whose "Show all" sub-modal
  // is currently open, or null when no sub-modal is showing. Lifted
  // out of `<Builder>` so the outer modal's Esc handler can read
  // it via `getState()` and bail — both listeners sit on window
  // in capture phase, and the outer one fires first, so it has to
  // explicitly defer to the sub-modal when one is open.
  subModalKey: string | null;
  open: () => void;
  close: () => void;
  openSubModal: (key: string) => void;
  closeSubModal: () => void;
}

export const useFilterModalStore = create<FilterModalState>((set) => ({
  isOpen: false,
  subModalKey: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, subModalKey: null }),
  openSubModal: (key) => set({ subModalKey: key }),
  closeSubModal: () => set({ subModalKey: null }),
}));
