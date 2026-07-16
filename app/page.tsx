"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, GraduationCap } from "lucide-react";
import type { CourseStatus, UserStats } from "@/lib/types";
import { getUserStats } from "@/lib/data/repository";
import { useLibrary } from "@/lib/hooks/use-library";
import { useAppStore } from "@/lib/store/app-store";
import { CourseCard } from "@/components/dashboard/course-card";
import { XpBar } from "@/components/gamification/xp-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS: { value: CourseStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function MyLearningPage() {
  const { courses, progressByCourse, loaded } = useLibrary();
  const dataVersion = useAppStore((s) => s.dataVersion);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tab, setTab] = useState<CourseStatus>("active");

  useEffect(() => {
    getUserStats().then(setStats);
  }, [dataVersion]);

  const visible = courses.filter((c) => c.status === tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Learning</h1>
          <p className="text-sm text-muted-foreground">
            Pick up where you left off — a little every day beats a lot once.
          </p>
        </div>
        {stats && (
          <Card className="md:w-72">
            <CardContent className="p-3">
              <XpBar xpToday={stats.xpToday} />
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CourseStatus)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loaded && visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <GraduationCap className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {tab === "active"
              ? "No active courses yet — grab one from the catalog or create your own."
              : tab === "completed"
                ? "Nothing completed yet. It'll feel great when it lands here."
                : "Nothing archived."}
          </p>
          {tab === "active" && (
            <Button size="sm" nativeButton={false} render={<Link href="/catalog" />}>
              <Compass className="size-4" aria-hidden />
              Browse catalog
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={progressByCourse[course.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
