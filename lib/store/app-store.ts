import { create } from "zustand";
import type { ActivityCompletionResult } from "@/lib/types";

interface AppState {
  /** Pending celebration from the last completed activity (drives the toast). */
  celebration: ActivityCompletionResult | null;
  celebrate: (result: ActivityCompletionResult) => void;
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
