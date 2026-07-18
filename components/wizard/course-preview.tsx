"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Clock, Plus, Sparkles, Target } from "lucide-react";
import type { Course, CourseContent } from "@/lib/types";
import { addCourseToLibrary } from "@/lib/data/actions";
import { useAppStore } from "@/lib/store/app-store";
import { SkillTree } from "@/components/skill-map/skill-tree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WizardAnswers } from "./course-wizard";

/** The mocked "AI" course preview + skill map, with Add to My Learning. */
export function CoursePreview({
  content,
  answers,
  onRestart,
}: {
  content: CourseContent;
  answers: WizardAnswers;
  onRestart: () => void;
}) {
  const router = useRouter();
  const bump = useAppStore((s) => s.bumpDataVersion);
  const [adding, setAdding] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // A transient Course wrapper so the SkillTree can render content pre-library.
  const previewCourse: Course = { ...content, id: "preview", source: "custom", status: "active" };

  const pageCount = content.lessons.reduce((n, l) => n + l.pages.length, 0);

  async function add() {
    setAdding(true);
    const course = await addCourseToLibrary(content, "custom");
    bump();
    router.push(`/courses/${course.id}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-strong">
        <Sparkles className="size-4" aria-hidden />
        Your course is ready to preview
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{content.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{content.description}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {content.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="grid gap-2 rounded-lg bg-secondary/50 p-3 text-sm sm:grid-cols-3">
            <span className="flex items-center gap-1.5">
              <Target className="size-4 text-brand" aria-hidden />
              <span className="line-clamp-2">{answers.outcome || content.outcome}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-brand" aria-hidden />~{content.estimatedHours}h total
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4 text-brand" aria-hidden />
              {content.lessons.length} lessons · {pageCount} pages
            </span>
          </div>

          {answers.sources.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Drawing from your {answers.sources.length} uploaded source
              {answers.sources.length === 1 ? "" : "s"}: {answers.sources.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Skill map</h2>
        <SkillTree
          course={previewCourse}
          progress={null}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          preview
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={add} disabled={adding} className="sm:flex-1">
          <Plus className="size-4" aria-hidden />
          {adding ? "Adding…" : "Add to My Learning"}
        </Button>
        <Button variant="outline" onClick={onRestart} className="sm:w-auto">
          Start over
        </Button>
      </div>
    </motion.div>
  );
}
