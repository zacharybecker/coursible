// Client-safe derived metrics. Kept out of actions.ts because a "use server"
// module may only export async server functions.

import type { Course, CourseProgress } from "@/lib/types";

/** Overall course completion: fraction of all activities completed, 0-100. */
export function computeCourseCompletion(course: Course, progress: CourseProgress | null): number {
  const total = course.lessons.reduce((n, l) => n + l.activities.length, 0);
  if (total === 0 || !progress) return 0;
  const done = Object.values(progress.lessonProgress).reduce(
    (n, lp) => n + lp.completedActivityIds.length,
    0,
  );
  return Math.round((100 * done) / total);
}

/** Average mastery across all skill nodes, 0-100. */
export function computeAverageMastery(progress: CourseProgress | null): number {
  if (!progress) return 0;
  const values = Object.values(progress.masteryByNode);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
