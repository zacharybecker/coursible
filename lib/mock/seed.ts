import type { Course, CourseContent, CourseProgress, UserStats } from "@/lib/types";
import { dockerFundamentals } from "./courses/docker-fundamentals";
import { gitEssentials } from "./courses/git-essentials";
import { sqlAnalytics } from "./courses/sql-analytics";
import { pythonAutomation } from "./courses/python-automation";
import { markdownBasics } from "./courses/markdown-basics";

/** Starter-course catalog (content templates; copied into the library on start). */
export const starterCatalog: CourseContent[] = [
  dockerFundamentals,
  gitEssentials,
  sqlAnalytics,
  pythonAutomation,
  markdownBasics,
];

const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * The seeded library: an in-progress Docker course (in a cohort), a completed
 * Git course, and an archived Markdown course — so every dashboard tab has content.
 */
export const seedCourses: Course[] = [
  {
    ...dockerFundamentals,
    id: "course-docker-1",
    source: "starter",
    status: "active",
    cohort: { id: "cohort-devs-2026", name: "Platform Team Study Group", memberCount: 7 },
  },
  {
    ...gitEssentials,
    id: "course-git-1",
    source: "starter",
    status: "completed",
  },
  {
    ...markdownBasics,
    id: "course-md-1",
    source: "starter",
    status: "archived",
  },
];

export const seedProgress: CourseProgress[] = [
  {
    courseId: "course-docker-1",
    masteryByNode: {
      containers: 100,
      images: 80,
      volumes: 40,
      networking: 0,
      compose: 0,
      capstone: 0,
    },
    lessonProgress: {
      "docker-l1": {
        lessonId: "docker-l1",
        completedActivityIds: ["docker-l1-a1", "docker-l1-a2", "docker-l1-a3", "docker-l1-a4", "docker-l1-a5"],
        completed: true,
      },
      "docker-l2": {
        lessonId: "docker-l2",
        completedActivityIds: ["docker-l2-a1", "docker-l2-a2"],
        completed: true,
      },
      "docker-l3": {
        lessonId: "docker-l3",
        completedActivityIds: ["docker-l3-a1"],
        completed: false,
      },
      "docker-l4": {
        lessonId: "docker-l4",
        completedActivityIds: ["docker-l4-a1"],
        completed: false,
      },
    },
    xpEarned: 115,
    startedAt: daysFromNow(-14),
    lastActivityAt: daysFromNow(-1),
    nextReviewAt: daysFromNow(1),
  },
  {
    courseId: "course-git-1",
    masteryByNode: { "git-basics": 100, "git-branches": 100, "git-collab": 100 },
    lessonProgress: {
      "git-l1": { lessonId: "git-l1", completedActivityIds: ["git-l1-a1", "git-l1-a2"], completed: true },
      "git-l2": { lessonId: "git-l2", completedActivityIds: ["git-l2-a1"], completed: true },
      "git-l3": { lessonId: "git-l3", completedActivityIds: ["git-l3-a1"], completed: true },
    },
    xpEarned: 65,
    startedAt: daysFromNow(-45),
    lastActivityAt: daysFromNow(-20),
    nextReviewAt: daysFromNow(3),
  },
  {
    courseId: "course-md-1",
    masteryByNode: { "md-syntax": 60, "md-readme": 0 },
    lessonProgress: {
      "md-l1": { lessonId: "md-l1", completedActivityIds: ["md-l1-a1"], completed: true },
    },
    xpEarned: 10,
    startedAt: daysFromNow(-60),
    lastActivityAt: daysFromNow(-50),
    nextReviewAt: null,
  },
];

export const seedStats: UserStats = {
  totalXp: 190,
  xpToday: 0,
  currentStreak: 12,
  longestStreak: 12,
  // Streak counts as alive if the user studied yesterday; today extends it.
  lastStudyDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })(),
};

export { todayIso };
