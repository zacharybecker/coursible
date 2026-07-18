// Upserts the starter-course catalog into course_content. Starter content is
// generated through the real pipeline by scripts/generate-starters.ts and
// checked into lib/data/starter-courses/ as JSON — the pipeline's dogfood
// test. Idempotent: re-running updates content in place and keeps
// is_starter flags intact.

import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Db } from "./core";
import type { CourseContent } from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";

const STARTER_DIR = path.join(process.cwd(), "lib", "data", "starter-courses");

/** Parsed starter JSON. Validated at seed time and by starter-content.test.ts. */
export function loadStarterCourses(): CourseContent[] {
  if (!fs.existsSync(STARTER_DIR)) return [];
  return fs
    .readdirSync(STARTER_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(STARTER_DIR, f), "utf8")) as CourseContent);
}

export async function seedStarterCourses(db: Db): Promise<void> {
  for (const raw of loadStarterCourses()) {
    const content = validateCourseContent(raw);
    await db
      .insert(schema.courseContent)
      .values({
        contentId: content.contentId,
        title: content.title,
        description: content.description,
        outcome: content.outcome,
        tags: content.tags,
        estimatedHours: content.estimatedHours,
        schemaVersion: 2,
        concepts: content.concepts,
        skillNodes: content.skillNodes,
        lessons: content.lessons,
        isStarter: true,
        createdBy: null,
      })
      .onConflictDoUpdate({
        target: schema.courseContent.contentId,
        set: {
          title: content.title,
          description: content.description,
          outcome: content.outcome,
          tags: content.tags,
          estimatedHours: content.estimatedHours,
          schemaVersion: 2,
          concepts: content.concepts,
          skillNodes: content.skillNodes,
          lessons: content.lessons,
          isStarter: true,
          updatedAt: sql`now()`,
        },
      });
  }
}
