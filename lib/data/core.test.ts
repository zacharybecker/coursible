// @vitest-environment node
// Core-loop tests against real Postgres semantics: PGlite (in-memory) with
// the actual Drizzle schema and generated migrations. Ports the v1 scenarios
// to the page model and adds the new mastery rule (correct answers only).

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { fixtureCourse } from "@/lib/test-fixtures/course";
import {
  addCourseToLibrary,
  completePage,
  duplicateCourse,
  getAllProgress,
  getCourseById,
  getCourseProgress,
  getCourses,
  getCourseView,
  getStarterCatalog,
  getUserStats,
  setCourseStatus,
  type Db,
} from "./core";
import { loadStarterCourses, seedStarterCourses } from "./seed-content";
import { computeAverageMastery, computeCourseCompletion } from "./derive";

let db: Db;

const ALICE = "user-alice";
const BOB = "user-bob";

const utcDate = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite as unknown as Db;
  await seedStarterCourses(db);
});

beforeEach(async () => {
  await db.delete(schema.user).where(eq(schema.user.id, ALICE));
  await db.delete(schema.user).where(eq(schema.user.id, BOB));
  for (const id of [ALICE, BOB]) {
    await db.insert(schema.user).values({
      id,
      name: id,
      email: `${id}@example.com`,
    });
    await db.insert(schema.userStats).values({ userId: id });
  }
});

describe("starter catalog", () => {
  it("exposes exactly the seeded starter courses", async () => {
    const catalog = await getStarterCatalog(db);
    const starters = loadStarterCourses();
    expect(catalog.map((c) => c.contentId).sort()).toEqual(
      starters.map((c) => c.contentId).sort(),
    );
  });

  it("is idempotent to re-seed", async () => {
    await seedStarterCourses(db);
    expect((await getStarterCatalog(db)).length).toBe(loadStarterCourses().length);
  });
});

describe("library management", () => {
  it("adds a course as a fresh copy with empty progress", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    expect(course.contentId).toBe("content-fixture");
    expect(course.status).toBe("active");
    expect(course.schemaVersion).toBe(2);
    expect(course.concepts.length).toBe(3);
    expect(course.lessons.length).toBe(2);
    const progress = await getCourseProgress(db, ALICE, course.id);
    expect(progress?.xpEarned).toBe(0);
    expect(progress?.masteryByNode["n1"]).toBe(0);
  });

  it("duplicates an existing course with independent progress", async () => {
    const original = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    await completePage(db, ALICE, original.id, "l1", "l1-p3", "correct");
    const copy = await duplicateCourse(db, ALICE, original.id);
    expect(copy).not.toBeNull();
    expect(copy!.source).toBe("shared");
    expect(copy!.id).not.toBe(original.id);
    const originalProgress = await getCourseProgress(db, ALICE, original.id);
    const copyProgress = await getCourseProgress(db, ALICE, copy!.id);
    expect(originalProgress?.xpEarned).toBeGreaterThan(0);
    expect(copyProgress?.xpEarned).toBe(0);
  });

  it("archives and restores a course", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    await setCourseStatus(db, ALICE, course.id, "archived");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("archived");
    await setCourseStatus(db, ALICE, course.id, "active");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("active");
  });
});

describe("completePage — the core loop", () => {
  let courseId: string;

  beforeEach(async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    courseId = course.id;
  });

  it("awards full XP for a correct question-page completion", async () => {
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(result?.xpAwarded).toBe(10);
    const progress = await getCourseProgress(db, ALICE, courseId);
    expect(progress?.lessonProgress["l1"].completedPageIds).toContain("l1-p3");
    expect(progress?.xpEarned).toBe(10);
  });

  it("awards half XP for an incorrect completion", async () => {
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "incorrect");
    expect(result?.xpAwarded).toBe(5);
  });

  it("awards no XP for content pages but still counts them and the streak", async () => {
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p1", "correct");
    expect(result?.xpAwarded).toBe(0);
    expect(result?.streakExtended).toBe(true);
    const progress = await getCourseProgress(db, ALICE, courseId);
    expect(progress?.lessonProgress["l1"].completedPageIds).toContain("l1-p1");
    expect(progress?.xpEarned).toBe(0);
  });

  it("never double-awards XP for the same page", async () => {
    await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    const statsAfterFirst = await getUserStats(db, ALICE);
    const second = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(second?.xpAwarded).toBe(0);
    const statsAfterSecond = await getUserStats(db, ALICE);
    expect(statsAfterSecond.totalXp).toBe(statsAfterFirst.totalXp);
    expect(statsAfterSecond.xpToday).toBe(statsAfterFirst.xpToday);
  });

  it("recovers when the user_stats row is missing (pre-hook account)", async () => {
    // Simulate an account whose create hook never ran / failed.
    await db.delete(schema.userStats).where(eq(schema.userStats.userId, ALICE));
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(result?.xpAwarded).toBe(10);
    expect(result?.streakExtended).toBe(true);
    const stats = await getUserStats(db, ALICE);
    expect(stats.totalXp).toBe(10);
    expect(stats.currentStreak).toBe(1);
  });

  it("enforces completion uniqueness at the DB level", async () => {
    await db.insert(schema.pageCompletions).values({
      courseId,
      pageId: "l1-p1",
      lessonId: "l1",
      outcome: "correct",
      xpAwarded: 0,
    });
    await expect(
      db.insert(schema.pageCompletions).values({
        courseId,
        pageId: "l1-p1",
        lessonId: "l1",
        outcome: "correct",
        xpAwarded: 0,
      }),
    ).rejects.toThrow();
  });

  it("drives mastery from correct question outcomes only", async () => {
    // n1 has 2 question pages (l1-p3, l1-p4).
    const first = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(first?.nodeMastery).toBe(50);
    // Incorrect completion counts the page done but gives no mastery credit.
    const second = await completePage(db, ALICE, courseId, "l1", "l1-p4", "incorrect");
    expect(second?.nodeMastery).toBe(50);
    const progress = await getCourseProgress(db, ALICE, courseId);
    expect(progress?.masteryByNode["n1"]).toBe(50);
  });

  it("content pages do not change mastery", async () => {
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p1", "correct");
    expect(result?.nodeMastery).toBe(0);
  });

  it("starts a streak of 1 on a fresh account and does not extend twice same day", async () => {
    const first = await completePage(db, ALICE, courseId, "l1", "l1-p1", "correct");
    expect(first?.streakExtended).toBe(true);
    expect(first?.currentStreak).toBe(1);
    const second = await completePage(db, ALICE, courseId, "l1", "l1-p2", "correct");
    expect(second?.streakExtended).toBe(false);
    expect(second?.currentStreak).toBe(1);
  });

  it("extends the streak when the last study day was yesterday (UTC)", async () => {
    await db
      .update(schema.userStats)
      .set({ currentStreak: 12, longestStreak: 12, lastStudyDate: utcDate(-1), xpToday: 55 })
      .where(eq(schema.userStats.userId, ALICE));
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(result?.streakExtended).toBe(true);
    expect(result?.currentStreak).toBe(13);
    const stats = await getUserStats(db, ALICE);
    expect(stats.longestStreak).toBe(13);
    expect(stats.lastStudyDate).toBe(utcDate(0));
    // xp_today was reset for the new day before adding this completion's XP.
    expect(stats.xpToday).toBe(result?.xpAwarded);
  });

  it("resets the streak to 1 after a gap", async () => {
    await db
      .update(schema.userStats)
      .set({ currentStreak: 7, longestStreak: 9, lastStudyDate: utcDate(-3) })
      .where(eq(schema.userStats.userId, ALICE));
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(result?.currentStreak).toBe(1);
    expect((await getUserStats(db, ALICE)).longestStreak).toBe(9);
  });

  it("marks the lesson complete when its last page completes", async () => {
    await completePage(db, ALICE, courseId, "l1", "l1-p1", "correct");
    await completePage(db, ALICE, courseId, "l1", "l1-p2", "correct");
    await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p4", "correct");
    expect(result?.lessonCompleted).toBe(true);
  });

  it("marks the course completed when every page is done", async () => {
    const course = (await getCourseById(db, ALICE, courseId))!;
    let last: Awaited<ReturnType<typeof completePage>> = null;
    for (const lesson of course.lessons) {
      for (const page of lesson.pages) {
        last = await completePage(db, ALICE, courseId, lesson.id, page.id, "correct");
      }
    }
    expect(last?.courseCompleted).toBe(true);
    expect((await getCourseById(db, ALICE, courseId))?.status).toBe("completed");
  });

  it("returns null for unknown ids", async () => {
    expect(await completePage(db, ALICE, "nope", "l1", "l1-p1", "correct")).toBeNull();
    expect(await completePage(db, ALICE, courseId, "nope", "x", "correct")).toBeNull();
    expect(await completePage(db, ALICE, courseId, "l1", "nope", "correct")).toBeNull();
  });
});

describe("multi-user isolation", () => {
  it("keeps libraries separate", async () => {
    await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    expect((await getCourses(db, ALICE)).length).toBe(1);
    expect((await getCourses(db, BOB)).length).toBe(0);
    expect((await getAllProgress(db, BOB)).length).toBe(0);
  });

  it("hides other users' courses from reads", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    expect(await getCourseById(db, BOB, course.id)).toBeNull();
    expect(await getCourseProgress(db, BOB, course.id)).toBeNull();
  });

  it("rejects mutations against courses the user does not own", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    const result = await completePage(db, BOB, course.id, "l1", "l1-p3", "correct");
    expect(result).toBeNull();
    await setCourseStatus(db, BOB, course.id, "archived");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("active");
    expect(await duplicateCourse(db, BOB, course.id)).toBeNull();
    const bobStats = await getUserStats(db, BOB);
    expect(bobStats.totalXp).toBe(0);
  });
});

describe("getCourseView", () => {
  it("returns course and progress together for the owner", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    await completePage(db, ALICE, course.id, "l1", "l1-p3", "correct");
    const view = await getCourseView(db, ALICE, course.id);
    expect(view?.course.id).toBe(course.id);
    expect(view?.course.lessons.length).toBe(2);
    expect(view?.progress?.xpEarned).toBe(10);
  });

  it("returns null for a course the user does not own", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    expect(await getCourseView(db, BOB, course.id)).toBeNull();
  });
});

describe("cohort member counts", () => {
  it("counts every member course in one grouped query", async () => {
    const owned = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    const joined = await addCourseToLibrary(db, BOB, fixtureCourse, "shared");
    await db.insert(schema.cohorts).values({
      id: "cohort-count",
      name: "Study Group",
      contentId: owned.contentId,
      ownerId: ALICE,
    });
    await db
      .update(schema.courses)
      .set({ cohortId: "cohort-count" })
      .where(eq(schema.courses.id, owned.id));
    await db
      .update(schema.courses)
      .set({ cohortId: "cohort-count" })
      .where(eq(schema.courses.id, joined.id));

    const view = await getCourseById(db, ALICE, owned.id);
    expect(view?.cohort?.name).toBe("Study Group");
    expect(view?.cohort?.memberCount).toBe(2);
  });
});

describe("derived metrics", () => {
  it("computes completion percentage across all pages", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    await completePage(db, ALICE, course.id, "l1", "l1-p1", "correct");
    await completePage(db, ALICE, course.id, "l1", "l1-p2", "correct");
    const full = (await getCourseById(db, ALICE, course.id))!;
    const progress = await getCourseProgress(db, ALICE, course.id);
    // 2 of 8 pages complete.
    expect(computeCourseCompletion(full, progress)).toBe(25);
  });

  it("computes average mastery across nodes", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    // Both n1 questions correct → n1 = 100, n2 = 0 → average 50.
    await completePage(db, ALICE, course.id, "l1", "l1-p3", "correct");
    await completePage(db, ALICE, course.id, "l1", "l1-p4", "correct");
    const progress = await getCourseProgress(db, ALICE, course.id);
    expect(computeAverageMastery(progress)).toBe(50);
  });
});
