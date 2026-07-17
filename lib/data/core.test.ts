// @vitest-environment node
// Core-loop tests against real Postgres semantics: PGlite (in-memory) with the
// actual Drizzle schema and generated migrations. Ports the scenarios from the
// prototype's repository.test.ts and adds multi-user isolation and DB-level
// XP idempotency.

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { dockerFundamentals } from "@/lib/mock/courses/docker-fundamentals";
import {
  addCourseToLibrary,
  completeActivity,
  duplicateCourse,
  getAllProgress,
  getCourseById,
  getCourseProgress,
  getCourses,
  getStarterCatalog,
  getUserStats,
  setCourseStatus,
  type Db,
} from "./core";
import { seedStarterCourses } from "./seed-content";
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
  // Fresh users each test; cascades wipe courses/progress/completions.
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
  it("exposes the five seeded starter courses", async () => {
    const catalog = await getStarterCatalog(db);
    expect(catalog.length).toBe(5);
    expect(catalog[0].title).toBe("Docker Fundamentals");
    expect(catalog.map((c) => c.contentId)).toContain("content-git-essentials");
  });

  it("is idempotent to re-seed", async () => {
    await seedStarterCourses(db);
    expect((await getStarterCatalog(db)).length).toBe(5);
  });
});

describe("library management", () => {
  it("adds a catalog course as a fresh copy with empty progress", async () => {
    const course = await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    expect(course.contentId).toBe("content-docker-fundamentals");
    expect(course.status).toBe("active");
    expect(course.lessons.length).toBeGreaterThan(0);
    const progress = await getCourseProgress(db, ALICE, course.id);
    expect(progress?.xpEarned).toBe(0);
    expect(progress?.masteryByNode["containers"]).toBe(0);
  });

  it("duplicates an existing course with independent progress", async () => {
    const original = await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    await completeActivity(db, ALICE, original.id, "docker-l1", "docker-l1-a1", "correct");
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
    const course = await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    await setCourseStatus(db, ALICE, course.id, "archived");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("archived");
    await setCourseStatus(db, ALICE, course.id, "active");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("active");
  });
});

describe("completeActivity — the core loop", () => {
  let courseId: string;

  beforeEach(async () => {
    const course = await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    courseId = course.id;
  });

  it("awards full XP for a correct first completion", async () => {
    const result = await completeActivity(db, ALICE, courseId, "docker-l3", "docker-l3-a2", "correct");
    expect(result?.xpAwarded).toBe(20);
    const progress = await getCourseProgress(db, ALICE, courseId);
    expect(progress?.lessonProgress["docker-l3"].completedActivityIds).toContain("docker-l3-a2");
    expect(progress?.xpEarned).toBe(20);
  });

  it("awards half XP for a needs_review completion", async () => {
    const result = await completeActivity(
      db, ALICE, courseId, "docker-l3", "docker-l3-a2", "needs_review",
    );
    expect(result?.xpAwarded).toBe(10);
  });

  it("never double-awards XP for the same activity", async () => {
    await completeActivity(db, ALICE, courseId, "docker-l3", "docker-l3-a2", "correct");
    const statsAfterFirst = await getUserStats(db, ALICE);
    const second = await completeActivity(db, ALICE, courseId, "docker-l3", "docker-l3-a2", "correct");
    expect(second?.xpAwarded).toBe(0);
    const statsAfterSecond = await getUserStats(db, ALICE);
    expect(statsAfterSecond.totalXp).toBe(statsAfterFirst.totalXp);
    expect(statsAfterSecond.xpToday).toBe(statsAfterFirst.xpToday);
  });

  it("enforces completion uniqueness at the DB level", async () => {
    await db.insert(schema.activityCompletions).values({
      courseId,
      activityId: "docker-l1-a1",
      lessonId: "docker-l1",
      outcome: "correct",
      xpAwarded: 10,
    });
    await expect(
      db.insert(schema.activityCompletions).values({
        courseId,
        activityId: "docker-l1-a1",
        lessonId: "docker-l1",
        outcome: "correct",
        xpAwarded: 10,
      }),
    ).rejects.toThrow();
  });

  it("recomputes node mastery from completions over node activity count", async () => {
    // The "images" node (lesson docker-l3) has 2 activities.
    const first = await completeActivity(db, ALICE, courseId, "docker-l3", "docker-l3-a1", "correct");
    expect(first?.nodeMastery).toBe(50);
    const second = await completeActivity(db, ALICE, courseId, "docker-l3", "docker-l3-a2", "correct");
    expect(second?.nodeMastery).toBe(100);
    const progress = await getCourseProgress(db, ALICE, courseId);
    expect(progress?.masteryByNode["images"]).toBe(100);
  });

  it("starts a streak of 1 on a fresh account and does not extend twice same day", async () => {
    const first = await completeActivity(db, ALICE, courseId, "docker-l1", "docker-l1-a1", "correct");
    expect(first?.streakExtended).toBe(true);
    expect(first?.currentStreak).toBe(1);
    const second = await completeActivity(db, ALICE, courseId, "docker-l1", "docker-l1-a2", "correct");
    expect(second?.streakExtended).toBe(false);
    expect(second?.currentStreak).toBe(1);
  });

  it("extends the streak when the last study day was yesterday (UTC)", async () => {
    await db
      .update(schema.userStats)
      .set({ currentStreak: 12, longestStreak: 12, lastStudyDate: utcDate(-1), xpToday: 55 })
      .where(eq(schema.userStats.userId, ALICE));
    const result = await completeActivity(db, ALICE, courseId, "docker-l1", "docker-l1-a1", "correct");
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
    const result = await completeActivity(db, ALICE, courseId, "docker-l1", "docker-l1-a1", "correct");
    expect(result?.currentStreak).toBe(1);
    expect((await getUserStats(db, ALICE)).longestStreak).toBe(9);
  });

  it("marks the lesson complete when its last activity completes", async () => {
    await completeActivity(db, ALICE, courseId, "docker-l3", "docker-l3-a1", "correct");
    const result = await completeActivity(db, ALICE, courseId, "docker-l3", "docker-l3-a2", "correct");
    expect(result?.lessonCompleted).toBe(true);
  });

  it("marks the course completed when every activity is done", async () => {
    const course = (await getCourseById(db, ALICE, courseId))!;
    let last: Awaited<ReturnType<typeof completeActivity>> = null;
    for (const lesson of course.lessons) {
      for (const activity of lesson.activities) {
        last = await completeActivity(db, ALICE, courseId, lesson.id, activity.id, "correct");
      }
    }
    expect(last?.courseCompleted).toBe(true);
    expect((await getCourseById(db, ALICE, courseId))?.status).toBe("completed");
  });

  it("returns null for unknown ids", async () => {
    expect(await completeActivity(db, ALICE, "nope", "docker-l3", "docker-l3-a2", "correct")).toBeNull();
    expect(await completeActivity(db, ALICE, courseId, "nope", "x", "correct")).toBeNull();
    expect(await completeActivity(db, ALICE, courseId, "docker-l3", "nope", "correct")).toBeNull();
  });
});

describe("multi-user isolation", () => {
  it("keeps libraries separate", async () => {
    await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    expect((await getCourses(db, ALICE)).length).toBe(1);
    expect((await getCourses(db, BOB)).length).toBe(0);
    expect((await getAllProgress(db, BOB)).length).toBe(0);
  });

  it("hides other users' courses from reads", async () => {
    const course = await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    expect(await getCourseById(db, BOB, course.id)).toBeNull();
    expect(await getCourseProgress(db, BOB, course.id)).toBeNull();
  });

  it("rejects mutations against courses the user does not own", async () => {
    const course = await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    const result = await completeActivity(db, BOB, course.id, "docker-l1", "docker-l1-a1", "correct");
    expect(result).toBeNull();
    await setCourseStatus(db, BOB, course.id, "archived");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("active");
    expect(await duplicateCourse(db, BOB, course.id)).toBeNull();
    const bobStats = await getUserStats(db, BOB);
    expect(bobStats.totalXp).toBe(0);
  });
});

describe("derived metrics", () => {
  it("computes completion percentage across all activities", async () => {
    const course = await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    await completeActivity(db, ALICE, course.id, "docker-l1", "docker-l1-a1", "correct");
    await completeActivity(db, ALICE, course.id, "docker-l1", "docker-l1-a2", "correct");
    const full = (await getCourseById(db, ALICE, course.id))!;
    const progress = await getCourseProgress(db, ALICE, course.id);
    const totalActivities = full.lessons.reduce((n, l) => n + l.activities.length, 0);
    expect(computeCourseCompletion(full, progress)).toBe(Math.round((100 * 2) / totalActivities));
  });

  it("computes average mastery across nodes", async () => {
    const course = await addCourseToLibrary(db, ALICE, dockerFundamentals, "starter");
    // Complete both "images" activities → that node is 100, others 0 (6 nodes).
    await completeActivity(db, ALICE, course.id, "docker-l3", "docker-l3-a1", "correct");
    await completeActivity(db, ALICE, course.id, "docker-l3", "docker-l3-a2", "correct");
    const progress = await getCourseProgress(db, ALICE, course.id);
    expect(computeAverageMastery(progress)).toBe(Math.round(100 / 6));
  });
});
