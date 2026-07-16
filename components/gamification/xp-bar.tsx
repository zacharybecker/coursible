"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const DAILY_GOAL_XP = 50;

/** Daily XP progress toward the goal. */
export function XpBar({ xpToday, className }: { xpToday: number; className?: string }) {
  const pct = Math.min(100, Math.round((100 * xpToday) / DAILY_GOAL_XP));
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-semibold text-brand-strong">
          <Zap className="size-3.5" aria-hidden />
          {xpToday} XP today
        </span>
        <span className="text-muted-foreground">goal {DAILY_GOAL_XP}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Daily XP progress">
        <motion.div
          className="h-full rounded-full bg-brand"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
