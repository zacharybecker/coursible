// Upserts the starter-course catalog into course_content. Used by the seed
// script (scripts/seed.ts) and the PGlite test setup. Idempotent: re-running
// updates content in place and keeps is_starter flags intact.

import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Db } from "./core";
import { validateCourseContent } from "@/lib/validation/course-content";
import { dockerFundamentals } from "@/lib/mock/courses/docker-fundamentals";
import { gitEssentials } from "@/lib/mock/courses/git-essentials";
import { sqlAnalytics } from "@/lib/mock/courses/sql-analytics";
import { pythonAutomation } from "@/lib/mock/courses/python-automation";
import { markdownBasics } from "@/lib/mock/courses/markdown-basics";
import { ciCdPipelines } from "@/lib/mock/courses/ci-cd-pipelines";
import { webDevFoundations } from "@/lib/mock/courses/web-dev-foundations";
import { linuxCommandLine } from "@/lib/mock/courses/linux-command-line";
import { kubernetesBasics } from "@/lib/mock/courses/kubernetes-basics";

export const STARTER_COURSES = [
  dockerFundamentals,
  gitEssentials,
  sqlAnalytics,
  pythonAutomation,
  markdownBasics,
  ciCdPipelines,
  webDevFoundations,
  linuxCommandLine,
  kubernetesBasics,
];

export async function seedStarterCourses(db: Db): Promise<void> {
  for (const raw of STARTER_COURSES) {
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
          skillNodes: content.skillNodes,
          lessons: content.lessons,
          isStarter: true,
          updatedAt: sql`now()`,
        },
      });
  }
}
