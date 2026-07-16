"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Course, CourseProgress } from "@/lib/types";
import { getCourseById, getCourseProgress } from "@/lib/data/repository";
import { ActivityPlayer } from "@/components/lesson/activity-player";

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

  // Resume at the first incomplete activity (fresh redo if all are done).
  const completedIds = new Set(
    progress?.lessonProgress[lessonId]?.completedActivityIds ?? [],
  );
  let startIndex = lesson.activities.findIndex((a) => !completedIds.has(a.id));
  if (startIndex === -1) startIndex = 0;

  return (
    <div className="mx-auto max-w-2xl">
      <ActivityPlayer course={course} lesson={lesson} startIndex={startIndex} />
    </div>
  );
}
