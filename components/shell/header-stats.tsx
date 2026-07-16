"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import type { UserStats } from "@/lib/types";
import { getUserStats } from "@/lib/data/repository";
import { useAppStore } from "@/lib/store/app-store";
import { StreakBadge } from "@/components/gamification/streak-badge";

/** Streak + XP chips shown in the app chrome; refreshes after any data write. */
export function HeaderStats() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  if (!stats) return <div className="h-7 w-28" aria-hidden />;

  return (
    <div className="flex items-center gap-2">
      <StreakBadge days={stats.currentStreak} size="sm" />
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
        <Zap className="size-3.5 text-brand" aria-hidden />
        {stats.totalXp.toLocaleString()} XP
      </span>
    </div>
  );
}
