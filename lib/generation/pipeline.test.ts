// @vitest-environment node
// Pipeline stage tests with a stubbed ModelClient: happy path, the lesson
// repair loop (validation errors fed back into the prompt), and the
// unrecoverable-failure path (bounded retries, then a clean throw).

import { describe, expect, it } from "vitest";
import type { WizardAnswers } from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";
import {
  invalidLessonBPages,
  lessonCallsFor,
  makeStubModel,
  stubOutline,
  validLessonAPages,
  validLessonBPages,
} from "./generation-fixtures";
import { generateCourse, XP_BY_QUESTION_TYPE } from "./pipeline";

const answers: WizardAnswers = {
  outcome: "Ship an app in a container",
  knowledge: "beginner",
  time: "25",
  style: "mix",
  sources: [],
};

describe("generateCourse — happy path", () => {
  it("assembles a fully valid course from outline + lesson calls", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [validLessonBPages],
    });
    const statuses: string[] = [];
    const content = await generateCourse(model, answers, {
      onStatus: (s) => void statuses.push(s),
    });

    expect(() => validateCourseContent(content)).not.toThrow();
    expect(statuses).toEqual(["outlining", "generating", "validating"]);
    expect(content.contentId).toMatch(/^content-/);
    expect(content.schemaVersion).toBe(2);
    // Page ids are rewritten deterministically; XP is server-assigned.
    expect(content.lessons[0].pages.map((p) => p.id)).toEqual([
      "lesson-a-p1",
      "lesson-a-p2",
      "lesson-a-p3",
    ]);
    const mc = content.lessons[0].pages[2];
    expect(mc.type === "multiple_choice" && mc.xp).toBe(XP_BY_QUESTION_TYPE.multiple_choice);
    // lessonIds are derived from the lessons, not asked of the model.
    expect(content.skillNodes.map((n) => n.lessonIds)).toEqual([["lesson-a"], ["lesson-b"]]);
  });

  it("honors a contentId override (starter-course regeneration)", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [validLessonBPages],
    });
    const content = await generateCourse(model, answers, { contentId: "content-fixed" });
    expect(content.contentId).toBe("content-fixed");
  });
});

describe("generateCourse — repair loop", () => {
  it("regenerates a failing lesson with the concrete errors in the prompt", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [invalidLessonBPages, validLessonBPages],
    });
    const content = await generateCourse(model, answers);
    expect(() => validateCourseContent(content)).not.toThrow();

    const bCalls = lessonCallsFor(model.calls, "lesson-b");
    expect(bCalls).toHaveLength(2);
    expect(bCalls[0].user).not.toContain("rejected by the validator");
    expect(bCalls[1].user).toContain("rejected by the validator");
    expect(bCalls[1].user).toContain("question page before any content page");
  });

  it("fails cleanly after bounded retries when a lesson never validates", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [invalidLessonBPages],
    });
    await expect(generateCourse(model, answers)).rejects.toThrow(/Lesson B/);
    // 1 initial attempt + 2 repairs.
    expect(lessonCallsFor(model.calls, "lesson-b")).toHaveLength(3);
  });
});
