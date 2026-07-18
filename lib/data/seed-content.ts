// Starter catalog seeding. Slice-2 interim state: the old hand-written mock
// courses are gone; Task 9 replaces this with pipeline-generated JSON loaded
// from lib/data/starter-courses/. Until then the catalog seeds empty.

import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Db } from "./core";
import type { CourseContent } from "@/lib/types";

export function loadStarterCourses(): CourseContent[] {
  return [];
}

export async function seedStarterCourses(db: Db): Promise<void> {
  for (const content of loadStarterCourses()) {
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
