"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Archive, ArchiveRestore, CalendarClock, Copy, Share2, Users } from "lucide-react";
import type { Course, CourseProgress } from "@/lib/types";
import {
  computeAverageMastery,
  computeCourseCompletion,
  duplicateCourse,
  setCourseStatus,
} from "@/lib/data/repository";
import { useAppStore } from "@/lib/store/app-store";
import { MasteryRing } from "@/components/gamification/mastery-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShareCourseDialog } from "@/components/sharing/share-course-dialog";

function formatReview(nextReviewAt: string | null): string | null {
  if (!nextReviewAt) return null;
  const days = Math.ceil((new Date(nextReviewAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Review due now";
  if (days === 1) return "Review due tomorrow";
  return `Review in ${days} days`;
}

export function CourseCard({
  course,
  progress,
}: {
  course: Course;
  progress: CourseProgress | null;
}) {
  const bump = useAppStore((s) => s.bumpDataVersion);
  const completion = computeCourseCompletion(course, progress);
  const mastery = computeAverageMastery(progress);
  const review = formatReview(progress?.nextReviewAt ?? null);

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/courses/${course.id}`}
                className="line-clamp-1 font-semibold hover:underline"
              >
                {course.title}
              </Link>
              <p className="line-clamp-1 text-xs text-muted-foreground">{course.outcome}</p>
            </div>
            <MasteryRing value={mastery} />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{completion}% complete</span>
              <span>Mastery {mastery}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-brand"
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {course.cohort && (
              <Badge variant="secondary" className="gap-1">
                <Users className="size-3" aria-hidden />
                {course.cohort.name} · {course.cohort.memberCount}
              </Badge>
            )}
            {review && course.status === "active" && (
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3.5" aria-hidden />
                {review}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-1">
              <ShareCourseDialog course={course}>
                <Button variant="ghost" size="sm" aria-label={`Share ${course.title}`}>
                  <Share2 className="size-4" aria-hidden />
                </Button>
              </ShareCourseDialog>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Duplicate ${course.title}`}
                onClick={async () => {
                  await duplicateCourse(course.id);
                  bump();
                }}
              >
                <Copy className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={course.status === "archived" ? "Restore course" : "Archive course"}
                onClick={async () => {
                  await setCourseStatus(
                    course.id,
                    course.status === "archived" ? "active" : "archived",
                  );
                  bump();
                }}
              >
                {course.status === "archived" ? (
                  <ArchiveRestore className="size-4" aria-hidden />
                ) : (
                  <Archive className="size-4" aria-hidden />
                )}
              </Button>
            </div>
            <Button size="sm" nativeButton={false} render={<Link href={`/courses/${course.id}`} />}>
              {course.status === "completed" ? "Review" : completion > 0 ? "Continue" : "Start"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
