import { beforeEach, describe, expect, it } from "vitest";
import {
  addCourseToLibrary,
  completeActivity,
  computeAverageMastery,
  computeCourseCompletion,
  duplicateCourse,
  getCourseById,
  getCourseProgress,
  getCourses,
  getStarterCatalog,
  getUserStats,
  resetAllData,
  setCourseStatus,
} from "./repository";
import { dockerFundamentals } from "@/lib/mock/courses/docker-fundamentals";

beforeEach(async () => {
  window.localStorage.clear();
  await resetAllData();
});

describe("seeding", () => {
  it("hydrates the seed library on first read", async () => {
    const courses = await getCourses();
    expect(courses.length).toBe(3);
    expect(courses.map((c) => c.status).sort()).toEqual(["active", "archived", "completed"]);
  });

  it("exposes the starter catalog", async () => {
    const catalog = await getStarterCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(5);
    expect(catalog[0].title).toBe("Docker Fundamentals");
  });
});

describe("library management", () => {
  it("adds a catalog course as a fresh copy with empty progress", async () => {
    const course = await addCourseToLibrary(dockerFundamentals, "starter");
    expect(course.id).not.toBe("course-docker-1");
    expect(course.contentId).toBe("content-docker-fundamentals");
    const progress = await getCourseProgress(course.id);
    expect(progress?.xpEarned).toBe(0);
    expect(progress?.masteryByNode["containers"]).toBe(0);
  });

  it("duplicates an existing course with independent progress", async () => {
    const copy = await duplicateCourse("course-docker-1");
    expect(copy).not.toBeNull();
    expect(copy!.source).toBe("shared");
    expect(copy!.cohort).toBeUndefined();
    // Original progress is untouched; copy starts fresh.
    const originalProgress = await getCourseProgress("course-docker-1");
    const copyProgress = await getCourseProgress(copy!.id);
    expect(originalProgress?.xpEarned).toBeGreaterThan(0);
    expect(copyProgress?.xpEarned).toBe(0);
  });

  it("archives and restores a course", async () => {
    await setCourseStatus("course-docker-1", "archived");
    expect((await getCourseById("course-docker-1"))?.status).toBe("archived");
    await setCourseStatus("course-docker-1", "active");
    expect((await getCourseById("course-docker-1"))?.status).toBe("active");
  });
});

describe("completeActivity — the core loop", () => {
  it("awards full XP for a correct first completion", async () => {
    const result = await completeActivity("course-docker-1", "docker-l3", "docker-l3-a2", "correct");
    expect(result?.xpAwarded).toBe(20);
    const progress = await getCourseProgress("course-docker-1");
    expect(progress?.lessonProgress["docker-l3"].completedActivityIds).toContain("docker-l3-a2");
  });

  it("awards half XP for a needs_review completion", async () => {
    const result = await completeActivity("course-docker-1", "docker-l3", "docker-l3-a2", "needs_review");
    expect(result?.xpAwarded).toBe(10);
  });

  it("never double-awards XP for the same activity", async () => {
    await completeActivity("course-docker-1", "docker-l3", "docker-l3-a2", "correct");
    const statsAfterFirst = await getUserStats();
    const second = await completeActivity("course-docker-1", "docker-l3", "docker-l3-a2", "correct");
    expect(second?.xpAwarded).toBe(0);
    expect((await getUserStats()).totalXp).toBe(statsAfterFirst.totalXp);
  });

  it("updates node mastery as the node's activities complete", async () => {
    // 'images' node has 2 activities; seed has 1 complete → 50 after recompute.
    const result = await completeActivity("course-docker-1", "docker-l3", "docker-l3-a2", "correct");
    expect(result?.nodeMastery).toBe(100);
    const progress = await getCourseProgress("course-docker-1");
    expect(progress?.masteryByNode["images"]).toBe(100);
  });

  it("extends the streak on the first activity of the day", async () => {
    // Seed lastStudyDate is yesterday with a 12-day streak.
    const first = await completeActivity("course-docker-1", "docker-l3", "docker-l3-a2", "correct");
    expect(first?.streakExtended).toBe(true);
    expect(first?.currentStreak).toBe(13);
    // Second activity the same day does not extend again.
    const second = await completeActivity("course-docker-1", "docker-l4", "docker-l4-a2", "correct");
    expect(second?.streakExtended).toBe(false);
    expect(second?.currentStreak).toBe(13);
  });

  it("marks the lesson complete when its last activity completes", async () => {
    const result = await completeActivity("course-docker-1", "docker-l3", "docker-l3-a2", "correct");
    expect(result?.lessonCompleted).toBe(true);
  });

  it("marks the course completed when every lesson is done", async () => {
    const course = (await getCourseById("course-docker-1"))!;
    let last: Awaited<ReturnType<typeof completeActivity>> = null;
    for (const lesson of course.lessons) {
      for (const activity of lesson.activities) {
        last = await completeActivity(course.id, lesson.id, activity.id, "correct");
      }
    }
    expect(last?.courseCompleted).toBe(true);
    expect((await getCourseById(course.id))?.status).toBe("completed");
  });

  it("returns null for unknown ids", async () => {
    expect(await completeActivity("nope", "docker-l3", "docker-l3-a2", "correct")).toBeNull();
    expect(await completeActivity("course-docker-1", "nope", "x", "correct")).toBeNull();
  });
});

describe("derived metrics", () => {
  it("computes completion percentage across all activities", async () => {
    const course = (await getCourseById("course-docker-1"))!;
    const progress = await getCourseProgress("course-docker-1");
    const completion = computeCourseCompletion(course, progress);
    // Seed: 9 of 17 activities complete.
    expect(completion).toBe(Math.round((100 * 9) / 17));
  });

  it("computes average mastery across nodes", async () => {
    const progress = await getCourseProgress("course-docker-1");
    // Seed: (100+80+40+0+0+0)/6 ≈ 37.
    expect(computeAverageMastery(progress)).toBe(37);
  });
});
