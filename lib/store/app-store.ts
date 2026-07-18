import { create } from "zustand";
import type { PageCompletionResult } from "@/lib/types";

interface AppState {
  /** Pending celebration from the last completed page (drives the toast). */
  celebration: PageCompletionResult | null;
  celebrate: (result: PageCompletionResult) => void;
  clearCelebration: () => void;
  /** Bumped after any repository write so header stats & lists re-fetch. */
  dataVersion: number;
  bumpDataVersion: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  celebration: null,
  celebrate: (result) => set({ celebration: result }),
  clearCelebration: () => set({ celebration: null }),
  dataVersion: 0,
  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}));
