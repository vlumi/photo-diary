import { create } from "zustand";

const STORAGE_KEY = "beta-features";

export type BetaMode = "user" | "on" | "off";
export type BetaFeature = "regions";

export const BETA_FEATURES: BetaFeature[] = ["regions"];

const defaultStored = (): Record<BetaFeature, boolean> =>
  Object.fromEntries(BETA_FEATURES.map((f) => [f, false])) as Record<
    BetaFeature,
    boolean
  >;
const defaultModes = (): Record<BetaFeature, BetaMode> =>
  Object.fromEntries(BETA_FEATURES.map((f) => [f, "user"])) as Record<
    BetaFeature,
    BetaMode
  >;

const computeEnabled = (
  modes: Record<BetaFeature, BetaMode>,
  stored: Record<BetaFeature, boolean>
): Record<BetaFeature, boolean> =>
  Object.fromEntries(
    BETA_FEATURES.map((f) => [
      f,
      modes[f] === "on" ? true : modes[f] === "off" ? false : stored[f],
    ])
  ) as Record<BetaFeature, boolean>;

const readStored = (): Record<BetaFeature, boolean> => {
  const def = defaultStored();
  if (typeof window === "undefined" || !window.localStorage) return def;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw || raw === "1") return def;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return def;
    return { ...def, ...parsed };
  } catch {
    return def;
  }
};

const writeStored = (s: Record<BetaFeature, boolean>) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
};

interface BetaState {
  modes: Record<BetaFeature, BetaMode>;
  stored: Record<BetaFeature, boolean>;
  enabled: Record<BetaFeature, boolean>;
  setModes: (next: Partial<Record<BetaFeature, BetaMode>>) => void;
  setStored: (feature: BetaFeature, next: boolean) => void;
}

export const useBetaStore = create<BetaState>((set) => {
  const stored = readStored();
  const modes = defaultModes();
  return {
    modes,
    stored,
    enabled: computeEnabled(modes, stored),
    setModes: (next) =>
      set((s) => {
        const modes = { ...s.modes, ...next };
        return { modes, enabled: computeEnabled(modes, s.stored) };
      }),
    setStored: (feature, value) =>
      set((s) => {
        const stored = { ...s.stored, [feature]: value };
        writeStored(stored);
        return { stored, enabled: computeEnabled(s.modes, stored) };
      }),
  };
});
