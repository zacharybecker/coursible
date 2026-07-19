import { create } from "zustand";
import type { PageCompletionResult } from "@/lib/types";

interface AppState {
  /** Pending celebration from the last completed page (drives the toast). */
  celebration: PageCompletionResult | null;
  /** Latches true on the first celebration so the toast (and framer-motion)
   *  can be mounted lazily — only once there's ever something to celebrate. */
  hasCelebratedEver: boolean;
  celebrate: (result: PageCompletionResult) => void;
  clearCelebration: () => void;
  /** Bumped after any repository write so header stats & lists re-fetch. */
  dataVersion: number;
  bumpDataVersion: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  celebration: null,
  hasCelebratedEver: false,
  celebrate: (result) => set({ celebration: result, hasCelebratedEver: true }),
  clearCelebration: () => set({ celebration: null }),
  dataVersion: 0,
  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}));
