"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, PartyPopper, Zap } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";

/** Global toast celebrating XP, streak extensions, and completions. */
export function CelebrationToast() {
  const celebration = useAppStore((s) => s.celebration);
  const clear = useAppStore((s) => s.clearCelebration);

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(clear, 3200);
    return () => clearTimeout(t);
  }, [celebration, clear]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center md:bottom-8">
      <AnimatePresence>
        {celebration && (
          <motion.div
            key="celebration"
            initial={{ y: 24, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-lg"
          >
            {celebration.xpAwarded > 0 && (
              <span className="flex items-center gap-1 font-bold text-brand-strong">
                <Zap className="size-4" aria-hidden />+{celebration.xpAwarded} XP
              </span>
            )}
            {celebration.xpAwarded === 0 && !celebration.lessonCompleted && (
              <span className="text-sm text-muted-foreground">Already completed — no XP this time</span>
            )}
            {celebration.streakExtended && (
              <span className="flex items-center gap-1 font-semibold text-brand-strong">
                <Flame className="size-4" aria-hidden />
                {celebration.currentStreak}-day streak!
              </span>
            )}
            {(celebration.lessonCompleted || celebration.courseCompleted) && (
              <span className="flex items-center gap-1 text-sm font-semibold">
                <PartyPopper className="size-4 text-brand" aria-hidden />
                {celebration.courseCompleted ? "Course complete!" : "Lesson complete!"}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
