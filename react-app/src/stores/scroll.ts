import { create } from "zustand";

// Remembers the scroll position per route path so back/forward navigation
// restores where the user was. Capped at MAX_HISTORY entries — older
// positions evict on insert. The store body is the same FIFO-of-paths
// machinery the previous `lib/scroll.ts` ran, just exposed via a Zustand
// hook instead of a factory function whose result was prop-drilled.
const MAX_HISTORY = 10;

interface ScrollState {
  positions: Record<string, number>;
  queue: string[];
  get: (path: string) => number;
  set: (path: string, position: number) => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  positions: {},
  queue: [],
  get: (path) => get().positions[path] ?? 0,
  set: (path, position) =>
    set((state) => {
      const nextPositions = { ...state.positions };
      let nextQueue = [...state.queue];
      if (path in nextPositions) {
        if (nextQueue[nextQueue.length - 1] === path) {
          nextQueue.pop();
        } else {
          nextQueue = nextQueue.filter((p) => p !== path);
        }
      }
      nextQueue.push(path);
      nextPositions[path] = position;
      while (nextQueue.length > MAX_HISTORY) {
        const removed = nextQueue.shift();
        if (removed !== undefined) delete nextPositions[removed];
      }
      return { positions: nextPositions, queue: nextQueue };
    }),
}));
