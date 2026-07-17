// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { CourseContent } from "@/lib/types";
import { courseContentSchema, validateCourseContent } from "./course-content";
import { dockerFundamentals } from "@/lib/mock/courses/docker-fundamentals";
import { gitEssentials } from "@/lib/mock/courses/git-essentials";
import { sqlAnalytics } from "@/lib/mock/courses/sql-analytics";
import { pythonAutomation } from "@/lib/mock/courses/python-automation";
import { markdownBasics } from "@/lib/mock/courses/markdown-basics";

const clone = (c: CourseContent): CourseContent => structuredClone(c);

describe("courseContentSchema", () => {
  it("accepts every starter course", () => {
    for (const course of [
      dockerFundamentals,
      gitEssentials,
      sqlAnalytics,
      pythonAutomation,
      markdownBasics,
    ]) {
      const result = courseContentSchema.safeParse(course);
      expect(result.success, `${course.contentId}: ${JSON.stringify(result.error?.issues)}`).toBe(
        true,
      );
    }
  });

  it("rejects a dangling prereq id", () => {
    const course = clone(dockerFundamentals);
    course.skillNodes[1].prereqIds.push("no-such-node");
    expect(courseContentSchema.safeParse(course).success).toBe(false);
  });

  it("rejects a cyclic prereq graph", () => {
    const course = clone(dockerFundamentals);
    const [a, b] = course.skillNodes;
    a.prereqIds.push(b.id);
    b.prereqIds.push(a.id);
    expect(courseContentSchema.safeParse(course).success).toBe(false);
  });

  it("rejects a correctOptionId that matches no option", () => {
    const course = clone(dockerFundamentals);
    const withQuestions = course.lessons
      .flatMap((l) => l.activities)
      .find((act) => act.type === "explanation_check");
    expect(withQuestions).toBeDefined();
    if (withQuestions?.type === "explanation_check") {
      withQuestions.questions[0].correctOptionId = "no-such-option";
    }
    expect(courseContentSchema.safeParse(course).success).toBe(false);
  });

  it("rejects a lesson pointing at an unknown skill node", () => {
    const course = clone(dockerFundamentals);
    course.lessons[0].skillNodeId = "no-such-node";
    expect(courseContentSchema.safeParse(course).success).toBe(false);
  });

  it("rejects an activity pointing at an unknown skill node", () => {
    const course = clone(dockerFundamentals);
    course.lessons[0].activities[0].skillNodeId = "no-such-node";
    expect(courseContentSchema.safeParse(course).success).toBe(false);
  });

  it("validateCourseContent returns typed content or throws", () => {
    expect(validateCourseContent(dockerFundamentals).contentId).toBe(
      dockerFundamentals.contentId,
    );
    expect(() => validateCourseContent({ nope: true })).toThrow();
  });
});
