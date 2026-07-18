// Validation tests for schema v2: structural checks retained from v1
// (prereq resolution, DAG, correctOptionId) plus the new referential and
// pedagogy checks. Each test deep-clones the fixture and breaks one rule.

import { describe, expect, it } from "vitest";
import type { CourseContent, Lesson, MultipleChoicePage } from "@/lib/types";
import { fixtureCourse } from "@/lib/test-fixtures/course";
import { validateCourseContent } from "./course-content";

function clone(): CourseContent {
  return structuredClone(fixtureCourse);
}

function expectInvalid(content: CourseContent, messagePart: string) {
  expect(() => validateCourseContent(content)).toThrowError(
    expect.objectContaining({
      issues: expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining(messagePart) }),
      ]),
    }),
  );
}

describe("structural checks (retained from v1)", () => {
  it("accepts the fixture course", () => {
    expect(validateCourseContent(fixtureCourse)).toEqual(fixtureCourse);
  });

  it("accepts a video page (schema-only this slice)", () => {
    const c = clone();
    c.lessons[0].pages.splice(2, 0, {
      type: "video",
      id: "l1-v1",
      title: "Watch: layers",
      searchQuery: "docker image layers explained",
      shouldCover: "How instructions map to layers",
      videoId: null,
      teaches: [],
    });
    expect(() => validateCourseContent(c)).not.toThrow();
  });

  it("rejects an unresolved prereq id", () => {
    const c = clone();
    c.skillNodes[1].prereqIds = ["ghost"];
    expectInvalid(c, 'prereq "ghost" matches no skill node');
  });

  it("rejects a prereq cycle", () => {
    const c = clone();
    c.skillNodes[0].prereqIds = ["n2"];
    expectInvalid(c, "cycle");
  });

  it("rejects a lesson pointing at an unknown skill node", () => {
    const c = clone();
    c.lessons[0].skillNodeId = "ghost";
    expectInvalid(c, 'unknown skill node "ghost"');
  });

  it("rejects a correctOptionId that matches no option", () => {
    const c = clone();
    (c.lessons[0].pages[2] as MultipleChoicePage).correctOptionId = "ghost";
    expectInvalid(c, 'correctOptionId "ghost" matches no option');
  });

  it("rejects a wrong schemaVersion", () => {
    const c = clone() as unknown as { schemaVersion: number };
    c.schemaVersion = 1;
    expect(() => validateCourseContent(c as unknown as CourseContent)).toThrow();
  });
});

describe("concept resolution", () => {
  it("rejects a question testing an unknown concept", () => {
    const c = clone();
    (c.lessons[0].pages[2] as MultipleChoicePage).tests = ["c-ghost"];
    expectInvalid(c, 'unknown concept "c-ghost"');
  });

  it("rejects a content page teaching an unknown concept", () => {
    const c = clone();
    const page = c.lessons[0].pages[0];
    if (page.type === "text") page.teaches = ["c-ghost"];
    expectInvalid(c, 'unknown concept "c-ghost"');
  });
});

describe("teach-before-test", () => {
  it("rejects a question that tests a concept taught later in the same lesson", () => {
    const c = clone();
    // Move the diagram (teaches c-layer) after the typing question (tests c-layer).
    const l1 = c.lessons[0];
    const [diagram] = l1.pages.splice(1, 1);
    l1.pages.push(diagram);
    expectInvalid(c, 'tests concept "c-layer" before it is taught');
  });

  it("accepts cross-lesson testing within the same node", () => {
    const c = clone();
    // Add a second n1 lesson that tests c-image (taught in l1) without re-teaching it.
    const extra: Lesson = {
      id: "l1b",
      title: "Images, applied",
      description: "Practice",
      skillNodeId: "n1",
      estimatedMinutes: 5,
      pages: [
        { type: "text", id: "l1b-p1", title: "Recap", body: "Quick recap.", teaches: [] },
        { type: "text", id: "l1b-p2", title: "More", body: "More recap.", teaches: [] },
        {
          type: "multiple_choice",
          id: "l1b-p3",
          prompt: "Images are…",
          tests: ["c-image"],
          explanation: "Immutable templates.",
          xp: 10,
          options: [
            { id: "a", text: "Immutable templates" },
            { id: "b", text: "Mutable processes", misconception: "Confuses images with containers" },
          ],
          correctOptionId: "a",
        },
      ],
    };
    c.lessons.splice(1, 0, extra);
    c.skillNodes[0].lessonIds.push("l1b");
    expect(() => validateCourseContent(c)).not.toThrow();
  });

  it("accepts testing concepts taught in a (transitive) prereq node", () => {
    // The fixture itself does this: l2-p3 tests c-image and c-layer from n1.
    expect(() => validateCourseContent(fixtureCourse)).not.toThrow();
  });

  it("rejects testing a concept from a non-prereq node", () => {
    const c = clone();
    // Break the prereq edge: n2 no longer requires n1, so l2 may not test n1 concepts.
    c.skillNodes[1].prereqIds = [];
    expectInvalid(c, 'tests concept "c-image" before it is taught');
  });
});

describe("coverage and teaching minimums", () => {
  it("rejects a concept that no content page teaches", () => {
    const c = clone();
    c.concepts.push({ id: "c-orphan", name: "Never taught" });
    expectInvalid(c, 'concept "c-orphan" is never taught');
  });

  it("rejects a lesson whose first page is a question", () => {
    const c = clone();
    const l1 = c.lessons[0];
    const [question] = l1.pages.splice(2, 1);
    l1.pages.unshift(question);
    expectInvalid(c, "question page before any content page");
  });

  it("rejects a lesson with fewer than 2 content pages", () => {
    const c = clone();
    // Remove l2's second text page → only 1 content page remains.
    c.lessons[1].pages.splice(1, 1);
    expectInvalid(c, "minimum is 2");
  });
});

describe("distractor shape", () => {
  it("rejects an incorrect option without a misconception", () => {
    const c = clone();
    const mc = c.lessons[0].pages[2] as MultipleChoicePage;
    delete mc.options[1].misconception;
    expectInvalid(c, 'incorrect option "o2" is missing a misconception');
  });

  it("rejects a correct option carrying a misconception", () => {
    const c = clone();
    const mc = c.lessons[0].pages[2] as MultipleChoicePage;
    mc.options[0].misconception = "should not be here";
    expectInvalid(c, 'correct option "o1" must not have a misconception');
  });
});
