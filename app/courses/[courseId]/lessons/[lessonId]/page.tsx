"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Course, CourseProgress } from "@/lib/types";
import { getCourseView } from "@/lib/data/actions";
import { InlineError } from "@/components/ui/inline-error";
import { Skeleton } from "@/components/ui/skeleton";
import { PagePlayer } from "@/components/lesson/page-player";

export default function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = use(params);
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Loaded once per lesson visit on purpose — mid-lesson repository writes
  // must not reset the player.
  useEffect(() => {
    let cancelled = false;
    getCourseView(courseId)
      .then((view) => {
        if (cancelled) return;
        setError(false);
        setCourse(view ? view.course : null);
        setProgress(view?.progress ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId, attempt]);

  if (error) {
    return (
      <InlineError
        onRetry={() => {
          setError(false);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (course === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-4" aria-busy="true" aria-label="Loading lesson">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  if (!course || !lesson) notFound();

  // Resume at the first incomplete page (fresh redo if all are done).
  const completedIds = new Set(
    progress?.lessonProgress[lessonId]?.completedPageIds ?? [],
  );
  let startIndex = lesson.pages.findIndex((p) => !completedIds.has(p.id));
  if (startIndex === -1) startIndex = 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PagePlayer course={course} lesson={lesson} startIndex={startIndex} />
    </div>
  );
}
