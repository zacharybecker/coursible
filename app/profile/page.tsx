"use client";

import { useEffect, useState } from "react";
import { Flame, RotateCcw, Trophy, Zap } from "lucide-react";
import type { UserStats } from "@/lib/types";
import { getUserStats, resetAllData } from "@/lib/data/repository";
import { useAppStore } from "@/lib/store/app-store";
import { XpBar } from "@/components/gamification/xp-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfilePage() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bump = useAppStore((s) => s.bumpDataVersion);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    getUserStats().then(setStats);
  }, [dataVersion]);

  if (!stats) return null;

  const tiles = [
    { icon: Flame, label: "Current streak", value: `${stats.currentStreak} days` },
    { icon: Trophy, label: "Longest streak", value: `${stats.longestStreak} days` },
    { icon: Zap, label: "Total XP", value: stats.totalXp.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your learning stats, all-time.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
              <Icon className="size-5 text-brand" aria-hidden />
              <span className="text-lg font-bold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <XpBar xpToday={stats.xpToday} />
        </CardContent>
      </Card>

      <div className="rounded-xl border border-dashed p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Prototype data lives in your browser. Reset restores the original demo state.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await resetAllData();
            bump();
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset demo data
        </Button>
      </div>
    </div>
  );
}
