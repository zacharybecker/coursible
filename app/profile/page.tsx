"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, LogOut, Trophy, Zap } from "lucide-react";
import type { UserStats } from "@/lib/types";
import { getUserStats } from "@/lib/data/actions";
import { authClient, signOut } from "@/lib/auth-client";
import { useAppStore } from "@/lib/store/app-store";
import { XpBar } from "@/components/gamification/xp-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfilePage() {
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);
  const { data: session } = authClient.useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getUserStats().then(setStats);
  }, [dataVersion]);

  if (!stats) return null;

  const tiles = [
    { icon: Flame, label: "Current streak", value: `${stats.currentStreak} days` },
    { icon: Trophy, label: "Longest streak", value: `${stats.longestStreak} days` },
    { icon: Zap, label: "Total XP", value: stats.totalXp.toLocaleString() },
  ];

  const user = session?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your learning stats, all-time.</p>
      </div>

      {user && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="size-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut();
                router.push("/signin");
                router.refresh();
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
