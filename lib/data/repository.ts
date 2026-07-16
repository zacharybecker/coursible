// Mock data repository. Functions are async and API-client-shaped so a real
// Postgres-backed API can replace the implementations without touching
// components. Persistence is localStorage (see storage.ts).

import type {
  Activity,
  ActivityCompletionResult,
  ActivityOutcome,
  Course,
  CourseContent,
  CourseProgress,
  CourseStatus,
  Lesson,
  UserStats,
} from "@/lib/types";
import { seedCourses, seedProgress, seedStats, starterCatalog } from "@/lib/mock/seed";
import { customCoursePreview } from "@/lib/mock/custom-preview";
import { readJson, removeKey, writeJson } from "./storage";

const KEYS = {
  courses: "learnapp:courses",
  progress: "learnapp:progress",
  stats: "learnapp:stats",
  seeded: "learnapp:seeded:v1",
} as const;

// ---------- seeding ----------

function ensureSeeded(): void {
  if (readJson<boolean>(KEYS.seeded)) return;
  writeJson(KEYS.courses, seedCourses);
  writeJson(KEYS.progress, seedProgress);
  writeJson(KEYS.stats, seedStats);
  writeJson(KEYS.seeded, true);
}

function loadCourses(): Course[] {
  ensureSeeded();
  return readJson<Course[]>(KEYS.courses) ?? [];
}

function loadProgress(): CourseProgress[] {
  ensureSeeded();
  return readJson<CourseProgress[]>(KEYS.progress) ?? [];
}

function loadStats(): UserStats {
  ensureSeeded();
  return readJson<UserStats>(KEYS.stats) ?? seedStats;
}

function saveCourses(courses: Course[]): void {
  writeJson(KEYS.courses, courses);
}

function saveProgress(progress: CourseProgress[]): void {
  writeJson(KEYS.progress, progress);
}

function saveStats(stats: UserStats): void {
  writeJson(KEYS.stats, stats);
}

// ---------- helpers ----------

const isoDate = (d: Date = new Date()) => d.toISOString().slice(0, 10);

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyProgress(courseId: string, content: CourseContent): CourseProgress {
  const masteryByNode: Record<string, number> = {};
  for (const node of content.skillNodes) masteryByNode[node.id] = 0;
  return {
    courseId,
    masteryByNode,
    lessonProgress: {},
    xpEarned: 0,
    startedAt: new Date().toISOString(),
    lastActivityAt: null,
    nextReviewAt: null,
  };
}

function findLesson(course: Course, lessonId: string): Lesson | undefined {
  return course.lessons.find((l) => l.id === lessonId);
}

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

// ---------- read API ----------

export async function getCourses(): Promise<Course[]> {
  return loadCourses();
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  return loadCourses().find((c) => c.id === courseId) ?? null;
}

export async function getCourseProgress(courseId: string): Promise<CourseProgress | null> {
  return loadProgress().find((p) => p.courseId === courseId) ?? null;
}

export async function getAllProgress(): Promise<CourseProgress[]> {
  return loadProgress();
}

export async function getUserStats(): Promise<UserStats> {
  return loadStats();
}

export async function getStarterCatalog(): Promise<CourseContent[]> {
  return starterCatalog;
}

export async function getCustomCoursePreview(): Promise<CourseContent> {
  return customCoursePreview;
}

// ---------- write API ----------

/** Copy a catalog course (or an existing library course) into the library. */
export async function addCourseToLibrary(
  content: CourseContent,
  source: Course["source"],
): Promise<Course> {
  const courses = loadCourses();
  const course: Course = {
    ...content,
    id: newId("course"),
    source,
    status: "active",
  };
  courses.unshift(course);
  saveCourses(courses);

  const progress = loadProgress();
  progress.push(emptyProgress(course.id, content));
  saveProgress(progress);
  return course;
}

/** Duplicate an existing library course (fresh copy, fresh progress). */
export async function duplicateCourse(courseId: string): Promise<Course | null> {
  const existing = await getCourseById(courseId);
  if (!existing) return null;
  const content: CourseContent = {
    contentId: existing.contentId,
    title: existing.title,
    description: existing.description,
    outcome: existing.outcome,
    tags: existing.tags,
    estimatedHours: existing.estimatedHours,
    skillNodes: existing.skillNodes,
    lessons: existing.lessons,
  };
  return addCourseToLibrary(content, "shared");
}

export async function setCourseStatus(courseId: string, status: CourseStatus): Promise<void> {
  const courses = loadCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) return;
  course.status = status;
  saveCourses(courses);
}

/**
 * Record an activity completion and run the core-loop bookkeeping:
 * mastery update → XP award → streak check → lesson/course completion.
 */
export async function completeActivity(
  courseId: string,
  lessonId: string,
  activityId: string,
  outcome: ActivityOutcome,
): Promise<ActivityCompletionResult | null> {
  const courses = loadCourses();
  const course = courses.find((c) => c.id === courseId);
  const lesson = course && findLesson(course, lessonId);
  const activity = lesson?.activities.find((a) => a.id === activityId);
  if (!course || !lesson || !activity) return null;

  const allProgress = loadProgress();
  let progress = allProgress.find((p) => p.courseId === courseId);
  if (!progress) {
    progress = emptyProgress(courseId, course);
    allProgress.push(progress);
  }

  let lp = progress.lessonProgress[lessonId];
  if (!lp) {
    lp = { lessonId, completedActivityIds: [], completed: false };
    progress.lessonProgress[lessonId] = lp;
  }

  const alreadyCompleted = lp.completedActivityIds.includes(activityId);
  const stats = loadStats();

  let xpAwarded = 0;
  if (!alreadyCompleted) {
    lp.completedActivityIds.push(activityId);
    xpAwarded = outcome === "correct" ? activity.xp : Math.round(activity.xp / 2);
  }

  // Mastery: fraction of the node's activities completed, weighted by outcome
  // credit for this one (completed re-attempts don't change mastery).
  const nodeMastery = updateNodeMastery(course, progress, activity);

  // Streak: extends on the first completed activity of a new day.
  const today = isoDate();
  let streakExtended = false;
  if (!alreadyCompleted) {
    if (stats.lastStudyDate !== today) {
      const yesterday = isoDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      stats.currentStreak = stats.lastStudyDate === yesterday ? stats.currentStreak + 1 : 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
      stats.lastStudyDate = today;
      stats.xpToday = 0;
      streakExtended = true;
    }
    stats.xpToday += xpAwarded;
    stats.totalXp += xpAwarded;
    progress.xpEarned += xpAwarded;
  }

  lp.completed = lp.completedActivityIds.length >= lesson.activities.length;
  progress.lastActivityAt = new Date().toISOString();
  // Next spaced review: 2 days out whenever something was studied.
  progress.nextReviewAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const courseCompleted = course.lessons.every(
    (l) => progress!.lessonProgress[l.id]?.completed ?? false,
  );
  if (courseCompleted && course.status === "active") {
    course.status = "completed";
    saveCourses(courses);
  }

  saveProgress(allProgress);
  saveStats(stats);

  return {
    outcome,
    xpAwarded,
    nodeMastery,
    streakExtended,
    currentStreak: stats.currentStreak,
    lessonCompleted: lp.completed,
    courseCompleted,
  };
}

function updateNodeMastery(course: Course, progress: CourseProgress, activity: Activity): number {
  const nodeId = activity.skillNodeId;
  const nodeActivities = course.lessons
    .flatMap((l) => l.activities)
    .filter((a) => a.skillNodeId === nodeId);
  if (nodeActivities.length === 0) return progress.masteryByNode[nodeId] ?? 0;

  const completedIds = new Set(
    Object.values(progress.lessonProgress).flatMap((lp) => lp.completedActivityIds),
  );
  const done = nodeActivities.filter((a) => completedIds.has(a.id)).length;
  const mastery = Math.round((100 * done) / nodeActivities.length);
  progress.masteryByNode[nodeId] = mastery;
  return mastery;
}

/** Wipe all local data and reseed (used by the profile screen). */
export async function resetAllData(): Promise<void> {
  removeKey(KEYS.courses);
  removeKey(KEYS.progress);
  removeKey(KEYS.stats);
  removeKey(KEYS.seeded);
  ensureSeeded();
}
