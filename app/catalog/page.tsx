"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, Plus, SearchX, Sparkles } from "lucide-react";
import type { CourseContent } from "@/lib/types";
import { addCourseToLibrary, getStarterCatalog } from "@/lib/data/actions";
import { useAppStore } from "@/lib/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CatalogPage() {
  const router = useRouter();
  const bump = useAppStore((s) => s.bumpDataVersion);
  const [catalog, setCatalog] = useState<CourseContent[]>([]);
  const [query, setQuery] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    getStarterCatalog().then(setCatalog);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [catalog, query]);

  async function startCourse(content: CourseContent) {
    setStartingId(content.contentId);
    const course = await addCourseToLibrary(content, "starter");
    bump();
    router.push(`/courses/${course.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Starter courses</h1>
        <p className="text-sm text-muted-foreground">
          Prebuilt, quality-controlled courses that work immediately. Starting one adds your own
          personal copy.
        </p>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, topic, or tag…"
        className="max-w-sm"
        aria-label="Search starter courses"
      />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Nothing matches “{query}”. Try a different term, or create a custom course instead.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((content, i) => (
            <motion.div
              key={content.contentId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {content.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold">{content.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {content.description}
                    </p>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5 text-brand" aria-hidden />
                    <span className="line-clamp-1">{content.outcome}</span>
                  </p>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden />~{content.estimatedHours}h ·{" "}
                      {content.lessons.length} lessons
                    </span>
                    <Button
                      size="sm"
                      disabled={startingId === content.contentId}
                      onClick={() => startCourse(content)}
                    >
                      <Plus className="size-4" aria-hidden />
                      {startingId === content.contentId ? "Adding…" : "Start course"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
