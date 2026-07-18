// Generation-job orchestration: one row per wizard submission. The route
// handler creates the row and schedules runGenerationJob after the response
// (next/server `after`); the wizard polls getGenerationJobView for real
// stage progress. On success the validated content is stored in
// course_content and the job carries its contentId; on failure only the
// error is recorded — no partial course is ever persisted.

import { and, eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { toCourseContent, type Db } from "@/lib/data/core";
import type { CourseContent, GenerationJobView, WizardAnswers } from "@/lib/types";
import type { ModelClient } from "./model";
import { generateCourse } from "./pipeline";

type JobRow = typeof schema.generationJobs.$inferSelect;

export async function createGenerationJob(
  db: Db,
  userId: string,
  answers: WizardAnswers,
): Promise<JobRow> {
  const [row] = await db
    .insert(schema.generationJobs)
    .values({ id: `genjob-${crypto.randomUUID()}`, userId, answers })
    .returning();
  return row;
}

async function updateJob(
  db: Db,
  jobId: string,
  patch: Partial<Pick<JobRow, "status" | "error" | "contentId">>,
): Promise<void> {
  await db
    .update(schema.generationJobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.generationJobs.id, jobId));
}

export async function runGenerationJob(db: Db, model: ModelClient, jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(schema.generationJobs)
    .where(eq(schema.generationJobs.id, jobId));
  if (!job || job.status !== "queued") return;
  try {
    const content = await generateCourse(model, job.answers, {
      onStatus: (status) => updateJob(db, jobId, { status }),
    });
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
        isStarter: false,
        createdBy: job.userId,
      })
      .onConflictDoNothing();
    await updateJob(db, jobId, { status: "done", contentId: content.contentId });
  } catch (err) {
    await updateJob(db, jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getGenerationJobView(
  db: Db,
  userId: string,
  jobId: string,
): Promise<GenerationJobView | null> {
  const [row] = await db
    .select()
    .from(schema.generationJobs)
    .where(and(eq(schema.generationJobs.id, jobId), eq(schema.generationJobs.userId, userId)));
  if (!row) return null;
  let content: CourseContent | null = null;
  if (row.status === "done" && row.contentId) {
    const [contentRow] = await db
      .select()
      .from(schema.courseContent)
      .where(eq(schema.courseContent.contentId, row.contentId));
    if (contentRow) content = toCourseContent(contentRow);
  }
  return { id: row.id, status: row.status, error: row.error, content };
}
