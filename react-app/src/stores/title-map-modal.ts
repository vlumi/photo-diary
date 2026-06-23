import { create } from "zustand";

// Title-bar MapModal open state. Lifted out of Title.tsx so the
// modal survives the URL-driven Title remounts that prev/next month
// and year nav cause — the operator wants the map to persist while
// they walk through the calendar. Auto-closers (Photo modal
// mount, gallery switch, Gallery↔Stats flip) call `close()`
// explicitly; bare year/month nav doesn't touch the store and the
// map stays open.
//
// Distinct from the per-photo MetadataPanel map, which is its own
// pin-centric component — this store doesn't reach into it.
interface TitleMapModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useTitleMapModalStore = create<TitleMapModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
