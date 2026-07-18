// @vitest-environment node
// CI gate: the checked-in starter catalog exists and passes the full
// schema-v2 validator (structure + pedagogy).

import { describe, expect, it } from "vitest";
import { validateCourseContent } from "@/lib/validation/course-content";
import { loadStarterCourses } from "./seed-content";

describe("starter catalog content", () => {
  it("has pipeline-generated starter courses checked in", () => {
    expect(loadStarterCourses().length).toBeGreaterThan(0);
  });

  it("every starter course passes full validation", () => {
    for (const content of loadStarterCourses()) {
      expect(() => validateCourseContent(content)).not.toThrow();
    }
  });
});
