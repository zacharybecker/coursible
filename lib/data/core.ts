// The real data layer: pure functions over a Drizzle Postgres handle, scoped
// to an authenticated user id. Server Actions (actions.ts) wrap these with
// session resolution and input validation; tests run them against PGlite.
//
// Ownership model: every query filters on courses.user_id, so a course that
// isn't yours is indistinguishable from one that doesn't exist (null result,
// no writes) — existence is never leaked.

import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import {
  isQuestionPage,
  type Cohort,
  type Course,
  type CourseContent,
  type CourseProgress,
  type CourseSource,
  type CourseStatus,
  type LessonProgress,
  type PageCompletionResult,
  type PageOutcome,
  type UserStats,
} from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";

/** Any Drizzle Postgres database over our schema (Neon in prod, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type ContentRow = typeof schema.courseContent.$inferSelect;
type CourseRow = typeof schema.courses.$inferSelect;
type CompletionRow = typeof schema.pageCompletions.$inferSelect;
type ProgressRow = typeof schema.courseProgress.$inferSelect;

// ---------- row → domain mapping ----------

export function toCourseContent(row: ContentRow): CourseContent {
  return {
    contentId: row.contentId,
    schemaVersion: 2,
    title: row.title,
    description: row.description,
    outcome: row.outcome,
    tags: row.tags,
    estimatedHours: row.estimatedHours,
    concepts: row.concepts,
    skillNodes: row.skillNodes,
    lessons: row.lessons,
  };
}

function toCourse(courseRow: CourseRow, contentRow: ContentRow, cohort?: Cohort): Course {
  return {
    ...toCourseContent(contentRow),
    id: courseRow.id,
    source: courseRow.source,
    status: courseRow.status,
    ...(cohort ? { cohort } : {}),
  };
}

function toProgress(
  progressRow: ProgressRow,
  contentRow: ContentRow,
  completions: CompletionRow[],
): CourseProgress {
  const byLesson = new Map<string, string[]>();
  for (const c of completions) {
    const ids = byLesson.get(c.lessonId) ?? [];
    ids.push(c.pageId);
    byLesson.set(c.lessonId, ids);
  }
  const lessonProgress: Record<string, LessonProgress> = {};
  for (const lesson of contentRow.lessons) {
    const completedPageIds = byLesson.get(lesson.id) ?? [];
    lessonProgress[lesson.id] = {
      lessonId: lesson.id,
      completedPageIds,
      completed:
        lesson.pages.length > 0 && completedPageIds.length >= lesson.pages.length,
    };
  }
  return {
    courseId: progressRow.courseId,
    masteryByNode: progressRow.masteryByNode,
    lessonProgress,
    xpEarned: progressRow.xpEarned,
    startedAt: progressRow.startedAt.toISOString(),
    lastActivityAt: progressRow.lastActivityAt?.toISOString() ?? null,
    nextReviewAt: progressRow.nextReviewAt?.toISOString() ?? null,
  };
}

// ---------- helpers ----------

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** UTC day string (YYYY-MM-DD), optionally offset by days. */
function utcDay(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function loadCohorts(db: Db, cohortIds: string[]): Promise<Map<string, Cohort>> {
  const result = new Map<string, Cohort>();
  if (cohortIds.length === 0) return result;
  const [rows, memberCounts] = await Promise.all([
    db.select().from(schema.cohorts).where(inArray(schema.cohorts.id, cohortIds)),
    // One grouped count instead of a query per cohort (no N+1).
    db
      .select({ cohortId: schema.courses.cohortId, members: count() })
      .from(schema.courses)
      .where(inArray(schema.courses.cohortId, cohortIds))
      .groupBy(schema.courses.cohortId),
  ]);
  const countByCohort = new Map(memberCounts.map((c) => [c.cohortId, c.members]));
  for (const row of rows) {
    result.set(row.id, { id: row.id, name: row.name, memberCount: countByCohort.get(row.id) ?? 0 });
  }
  return result;
}

async function loadOwnedCourse(
  db: Db,
  userId: string,
  courseId: string,
): Promise<{ courseRow: CourseRow; contentRow: ContentRow } | null> {
  const rows = await db
    .select({ courseRow: schema.courses, contentRow: schema.courseContent })
    .from(schema.courses)
    .innerJoin(schema.courseContent, eq(schema.courses.contentId, schema.courseContent.contentId))
    .where(and(eq(schema.courses.id, courseId), eq(schema.courses.userId, userId)));
  return rows[0] ?? null;
}

// ---------- reads ----------

export async function getCourses(db: Db, userId: string): Promise<Course[]> {
  const rows = await db
    .select({ courseRow: schema.courses, contentRow: schema.courseContent })
    .from(schema.courses)
    .innerJoin(schema.courseContent, eq(schema.courses.contentId, schema.courseContent.contentId))
    .where(eq(schema.courses.userId, userId))
    .orderBy(desc(schema.courses.createdAt), desc(schema.courses.id));
  const cohortIds = [...new Set(rows.map((r) => r.courseRow.cohortId).filter((v): v is string => !!v))];
  const cohorts = await loadCohorts(db, cohortIds);
  return rows.map((r) =>
    toCourse(r.courseRow, r.contentRow, r.courseRow.cohortId ? cohorts.get(r.courseRow.cohortId) : undefined),
  );
}

export async function getCourseById(db: Db, userId: string, courseId: string): Promise<Course | null> {
  const found = await loadOwnedCourse(db, userId, courseId);
  if (!found) return null;
  const cohorts = found.courseRow.cohortId ? await loadCohorts(db, [found.courseRow.cohortId]) : null;
  return toCourse(
    found.courseRow,
    found.contentRow,
    found.courseRow.cohortId ? cohorts?.get(found.courseRow.cohortId) : undefined,
  );
}

export async function getCourseProgress(
  db: Db,
  userId: string,
  courseId: string,
): Promise<CourseProgress | null> {
  const found = await loadOwnedCourse(db, userId, courseId);
  if (!found) return null;
  const [progressRow] = await db
    .select()
    .from(schema.courseProgress)
    .where(eq(schema.courseProgress.courseId, courseId));
  if (!progressRow) return null;
  const completions = await db
    .select()
    .from(schema.pageCompletions)
    .where(eq(schema.pageCompletions.courseId, courseId));
  return toProgress(progressRow, found.contentRow, completions);
}

/**
 * Course + its progress in a single owned-course load. The detail and lesson
 * pages need both; going through getCourseById + getCourseProgress ran the
 * owned-course join twice per page.
 */
export async function getCourseView(
  db: Db,
  userId: string,
  courseId: string,
): Promise<{ course: Course; progress: CourseProgress | null } | null> {
  const found = await loadOwnedCourse(db, userId, courseId);
  if (!found) return null;
  const { courseRow, contentRow } = found;
  const [cohorts, progressRow] = await Promise.all([
    courseRow.cohortId ? loadCohorts(db, [courseRow.cohortId]) : Promise.resolve(null),
    db
      .select()
      .from(schema.courseProgress)
      .where(eq(schema.courseProgress.courseId, courseId))
      .then((r) => r[0]),
  ]);
  const course = toCourse(
    courseRow,
    contentRow,
    courseRow.cohortId ? cohorts?.get(courseRow.cohortId) : undefined,
  );
  let progress: CourseProgress | null = null;
  if (progressRow) {
    const completions = await db
      .select()
      .from(schema.pageCompletions)
      .where(eq(schema.pageCompletions.courseId, courseId));
    progress = toProgress(progressRow, contentRow, completions);
  }
  return { course, progress };
}

export async function getAllProgress(db: Db, userId: string): Promise<CourseProgress[]> {
  const rows = await db
    .select({
      progressRow: schema.courseProgress,
      contentRow: schema.courseContent,
      courseId: schema.courses.id,
    })
    .from(schema.courseProgress)
    .innerJoin(schema.courses, eq(schema.courseProgress.courseId, schema.courses.id))
    .innerJoin(schema.courseContent, eq(schema.courses.contentId, schema.courseContent.contentId))
    .where(eq(schema.courses.userId, userId));
  if (rows.length === 0) return [];
  const completions = await db
    .select()
    .from(schema.pageCompletions)
    .where(inArray(schema.pageCompletions.courseId, rows.map((r) => r.courseId)));
  const byCourse = new Map<string, CompletionRow[]>();
  for (const c of completions) {
    const list = byCourse.get(c.courseId) ?? [];
    list.push(c);
    byCourse.set(c.courseId, list);
  }
  return rows.map((r) => toProgress(r.progressRow, r.contentRow, byCourse.get(r.courseId) ?? []));
}

export async function getUserStats(db: Db, userId: string): Promise<UserStats> {
  const [row] = await db.select().from(schema.userStats).where(eq(schema.userStats.userId, userId));
  if (!row) {
    return { totalXp: 0, xpToday: 0, currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }
  return {
    totalXp: row.totalXp,
    xpToday: row.xpToday,
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    lastStudyDate: row.lastStudyDate,
  };
}

export async function getStarterCatalog(db: Db): Promise<CourseContent[]> {
  const rows = await db
    .select()
    .from(schema.courseContent)
    .where(eq(schema.courseContent.isStarter, true))
    .orderBy(schema.courseContent.title);
  return rows.map(toCourseContent);
}

// ---------- writes ----------

/** Copy course content into the user's library with fresh progress. */
export async function addCourseToLibrary(
  db: Db,
  userId: string,
  content: CourseContent,
  source: CourseSource,
): Promise<Course> {
  const validated = validateCourseContent(content);
  return db.transaction(async (tx) => {
    // Content is immutable and shared by contentId; first writer wins.
    await tx
      .insert(schema.courseContent)
      .values({
        contentId: validated.contentId,
        title: validated.title,
        description: validated.description,
        outcome: validated.outcome,
        tags: validated.tags,
        estimatedHours: validated.estimatedHours,
        schemaVersion: 2,
        concepts: validated.concepts,
        skillNodes: validated.skillNodes,
        lessons: validated.lessons,
        isStarter: false,
        createdBy: source === "custom" ? userId : null,
      })
      .onConflictDoNothing();
    const [contentRow] = await tx
      .select()
      .from(schema.courseContent)
      .where(eq(schema.courseContent.contentId, validated.contentId));

    const courseId = newId("course");
    const [courseRow] = await tx
      .insert(schema.courses)
      .values({ id: courseId, userId, contentId: contentRow.contentId, source, status: "active" })
      .returning();

    const masteryByNode: Record<string, number> = {};
    for (const node of contentRow.skillNodes) masteryByNode[node.id] = 0;
    await tx.insert(schema.courseProgress).values({ courseId, masteryByNode });

    return toCourse(courseRow, contentRow);
  });
}

/** Duplicate an existing library course (fresh copy, fresh progress). */
export async function duplicateCourse(
  db: Db,
  userId: string,
  courseId: string,
): Promise<Course | null> {
  const found = await loadOwnedCourse(db, userId, courseId);
  if (!found) return null;
  return addCourseToLibrary(db, userId, toCourseContent(found.contentRow), "shared");
}

export async function setCourseStatus(
  db: Db,
  userId: string,
  courseId: string,
  status: CourseStatus,
): Promise<void> {
  await db
    .update(schema.courses)
    .set({ status })
    .where(and(eq(schema.courses.id, courseId), eq(schema.courses.userId, userId)));
}

/**
 * Record a page completion and run the core-loop bookkeeping in one
 * transaction: completion insert (ON CONFLICT DO NOTHING) → XP → mastery →
 * streak → course auto-completion. A conflicting insert means the page was
 * already completed: no XP, no stat changes, at the database level.
 * Content pages award no XP but count toward lesson completion and streaks.
 */
export async function completePage(
  db: Db,
  userId: string,
  courseId: string,
  lessonId: string,
  pageId: string,
  outcome: PageOutcome,
): Promise<PageCompletionResult | null> {
  return db.transaction(async (tx) => {
    const found = await loadOwnedCourse(tx, userId, courseId);
    if (!found) return null;
    const { courseRow, contentRow } = found;
    const lesson = contentRow.lessons.find((l) => l.id === lessonId);
    const page = lesson?.pages.find((p) => p.id === pageId);
    if (!lesson || !page) return null;

    const xp = isQuestionPage(page)
      ? outcome === "correct"
        ? page.xp
        : Math.round(page.xp / 2)
      : 0;
    const inserted = await tx
      .insert(schema.pageCompletions)
      .values({ courseId, pageId, lessonId, outcome, xpAwarded: xp })
      .onConflictDoNothing()
      .returning();
    const isNew = inserted.length > 0;
    const xpAwarded = isNew ? xp : 0;

    const completions = await tx
      .select()
      .from(schema.pageCompletions)
      .where(eq(schema.pageCompletions.courseId, courseId));
    const completedIds = new Set(completions.map((c) => c.pageId));
    const correctIds = new Set(
      completions.filter((c) => c.outcome === "correct").map((c) => c.pageId),
    );

    // Mastery: fraction of the node's question pages answered correctly.
    // (Open-ended "pass" arrives here as "correct"; "partial" as "incorrect".)
    const nodeQuestionPages = contentRow.lessons
      .filter((l) => l.skillNodeId === lesson.skillNodeId)
      .flatMap((l) => l.pages)
      .filter(isQuestionPage);
    const nodeMastery =
      nodeQuestionPages.length === 0
        ? 0
        : Math.round(
            (100 * nodeQuestionPages.filter((p) => correctIds.has(p.id)).length) /
              nodeQuestionPages.length,
          );

    const [progressRow] = await tx
      .select()
      .from(schema.courseProgress)
      .where(eq(schema.courseProgress.courseId, courseId))
      .for("update");

    let streakExtended = false;
    let currentStreak = 0;

    if (isNew) {
      const masteryByNode = { ...(progressRow?.masteryByNode ?? {}) };
      masteryByNode[lesson.skillNodeId] = nodeMastery;
      await tx
        .update(schema.courseProgress)
        .set({
          masteryByNode,
          xpEarned: (progressRow?.xpEarned ?? 0) + xpAwarded,
          lastActivityAt: new Date(),
          // Next spaced review: 2 days out whenever something was studied.
          nextReviewAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        })
        .where(eq(schema.courseProgress.courseId, courseId));

      // Guarantee a stats row exists: the create hook can be missing for
      // pre-hook accounts or if it failed, and destructuring undefined here
      // would throw (→ 500 on a user's first completion).
      await tx.insert(schema.userStats).values({ userId }).onConflictDoNothing();
      const [stats] = await tx
        .select()
        .from(schema.userStats)
        .where(eq(schema.userStats.userId, userId))
        .for("update");
      const today = utcDay();
      let { currentStreak: streak, longestStreak, xpToday } = stats;
      if (stats.lastStudyDate !== today) {
        // First completion of a new UTC day.
        streak = stats.lastStudyDate === utcDay(-1) ? streak + 1 : 1;
        longestStreak = Math.max(longestStreak, streak);
        xpToday = 0;
        streakExtended = true;
      }
      await tx
        .update(schema.userStats)
        .set({
          totalXp: stats.totalXp + xpAwarded,
          xpToday: xpToday + xpAwarded,
          currentStreak: streak,
          longestStreak,
          lastStudyDate: today,
        })
        .where(eq(schema.userStats.userId, userId));
      currentStreak = streak;
    } else {
      const [stats] = await tx
        .select()
        .from(schema.userStats)
        .where(eq(schema.userStats.userId, userId));
      currentStreak = stats?.currentStreak ?? 0;
    }

    const lessonCompleted = lesson.pages.every((p) => completedIds.has(p.id));
    const allPages = contentRow.lessons.flatMap((l) => l.pages);
    const courseCompleted = allPages.every((p) => completedIds.has(p.id));
    if (courseCompleted && courseRow.status === "active") {
      await tx
        .update(schema.courses)
        .set({ status: "completed" })
        .where(eq(schema.courses.id, courseId));
    }

    return {
      outcome,
      xpAwarded,
      nodeMastery,
      streakExtended,
      currentStreak,
      lessonCompleted,
      courseCompleted,
    };
  });
}
