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
  // Kebab-case category to scroll into view on the next Builder
  // render. Set by `openAtCategory` when the operator clicks an
  // active-value chunk in the strip — opens the modal landed on
  // that card. Builder clears it after applying the scroll so a
  // subsequent reopen doesn't re-jump.
  highlightCategory: string | null;
  open: () => void;
  openAtCategory: (category: string) => void;
  close: () => void;
  openSubModal: (key: string) => void;
  closeSubModal: () => void;
  clearHighlight: () => void;
}

export const useFilterModalStore = create<FilterModalState>((set) => ({
  isOpen: false,
  subModalKey: null,
  highlightCategory: null,
  open: () => set({ isOpen: true, highlightCategory: null }),
  openAtCategory: (category) =>
    set({ isOpen: true, highlightCategory: category }),
  close: () =>
    set({ isOpen: false, subModalKey: null, highlightCategory: null }),
  openSubModal: (key) => set({ subModalKey: key }),
  closeSubModal: () => set({ subModalKey: null }),
  clearHighlight: () => set({ highlightCategory: null }),
}));
