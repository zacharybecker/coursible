"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, CircleDot, Clock, Lock, Play, Share2, Users } from "lucide-react";
import type { Course, CourseProgress } from "@/lib/types";
import { getCourseById, getCourseProgress } from "@/lib/data/actions";
import { computeAverageMastery, computeCourseCompletion } from "@/lib/data/derive";
import { useAppStore } from "@/lib/store/app-store";
import { getNodeState, SkillTree } from "@/components/skill-map/skill-tree";
import { MasteryRing } from "@/components/gamification/mastery-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShareCourseDialog } from "@/components/sharing/share-course-dialog";

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCourseById(courseId), getCourseProgress(courseId)]).then(([c, p]) => {
      setCourse(c);
      setProgress(p);
      // Default selection: first non-complete, unlocked node.
      if (c) {
        setSelectedNodeId((prev) => {
          if (prev && c.skillNodes.some((n) => n.id === prev)) return prev;
          const next =
            c.skillNodes.find((n) => {
              const s = getNodeState(n, c, p);
              return s === "in_progress" || s === "available";
            }) ?? c.skillNodes[0];
          return next?.id ?? null;
        });
      }
    });
  }, [courseId, dataVersion]);

  const selectedNode = useMemo(
    () => course?.skillNodes.find((n) => n.id === selectedNodeId) ?? null,
    [course, selectedNodeId],
  );

  if (course === undefined) return null;
  if (course === null) notFound();

  const completion = computeCourseCompletion(course, progress);
  const mastery = computeAverageMastery(progress);
  const nodeState = selectedNode ? getNodeState(selectedNode, course, progress) : null;
  const nodeLessons = selectedNode
    ? course.lessons.filter((l) => l.skillNodeId === selectedNode.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            My Learning
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{completion}% complete</span>
            <span aria-hidden>·</span>
            <span>Mastery {mastery}%</span>
            {course.cohort && (
              <Badge variant="secondary" className="gap-1">
                <Users className="size-3" aria-hidden />
                {course.cohort.name}
              </Badge>
            )}
          </div>
        </div>
        <ShareCourseDialog course={course}>
          <Button variant="outline" size="sm">
            <Share2 className="size-4" aria-hidden />
            Share
          </Button>
        </ShareCourseDialog>
      </div>

      <SkillTree
        course={course}
        progress={progress}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
      />

      {selectedNode && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  {selectedNode.title}
                  {nodeState === "locked" && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="size-3" aria-hidden />
                      Locked
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">{selectedNode.description}</p>
                {nodeState === "locked" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Complete{" "}
                    {selectedNode.prereqIds
                      .map((pid) => course.skillNodes.find((n) => n.id === pid)?.title)
                      .filter(Boolean)
                      .join(" and ")}{" "}
                    to unlock.
                  </p>
                )}
              </div>
              <MasteryRing value={progress?.masteryByNode[selectedNode.id] ?? 0} />
            </div>

            <ul className="space-y-2">
              {nodeLessons.map((lesson) => {
                const lp = progress?.lessonProgress[lesson.id];
                const done = lp?.completed ?? false;
                const started = (lp?.completedActivityIds.length ?? 0) > 0;
                const locked = nodeState === "locked";
                return (
                  <li key={lesson.id}>
                    <div
                      className={
                        "flex items-center justify-between gap-3 rounded-lg border p-3 " +
                        (locked ? "opacity-60" : "")
                      }
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {done ? (
                          <CheckCircle2 className="size-5 shrink-0 text-brand" aria-hidden />
                        ) : started ? (
                          <CircleDot className="size-5 shrink-0 text-brand" aria-hidden />
                        ) : (
                          <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{lesson.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {lesson.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                          <Clock className="size-3.5" aria-hidden />
                          {lesson.estimatedMinutes}m
                        </span>
                        {locked ? (
                          <Lock className="size-4 text-muted-foreground" aria-hidden />
                        ) : (
                          <Button
                            size="sm"
                            variant={done ? "outline" : "default"}
                            nativeButton={false}
                            render={<Link href={`/courses/${course.id}/lessons/${lesson.id}`} />}
                          >
                            <Play className="size-3.5" aria-hidden />
                            {done ? "Redo" : started ? "Continue" : "Start"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
