"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Course, CourseProgress } from "@/lib/types";
import { getCourseById, getCourseProgress } from "@/lib/data/actions";
import { PagePlayer } from "@/components/lesson/page-player";

export default function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = use(params);
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  // Loaded once per lesson visit on purpose — mid-lesson repository writes
  // must not reset the player.
  useEffect(() => {
    Promise.all([getCourseById(courseId), getCourseProgress(courseId)]).then(([c, p]) => {
      setCourse(c);
      setProgress(p);
    });
  }, [courseId, lessonId]);

  if (course === undefined) return null;
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
