// @vitest-environment node
// Job lifecycle against PGlite: status progression to done with stored
// content, clean failure with no partial course persisted, and per-user
// job visibility.

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Db } from "@/lib/data/core";
import type { WizardAnswers } from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";
import {
  invalidLessonBPages,
  makeStubModel,
  stubOutline,
  validLessonAPages,
  validLessonBPages,
} from "./generation-fixtures";
import { createGenerationJob, getGenerationJobView, runGenerationJob } from "./jobs";

let db: Db;

const ALICE = "user-alice";
const BOB = "user-bob";

const answers: WizardAnswers = {
  outcome: "Ship an app in a container",
  knowledge: "beginner",
  time: "25",
  style: "mix",
  sources: [],
};

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite as unknown as Db;
});

beforeEach(async () => {
  await db.delete(schema.generationJobs);
  await db.delete(schema.courseContent);
  await db.delete(schema.user).where(eq(schema.user.id, ALICE));
  await db.delete(schema.user).where(eq(schema.user.id, BOB));
  for (const id of [ALICE, BOB]) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com` });
  }
});

describe("runGenerationJob", () => {
  it("runs the pipeline, stores the content, and marks the job done", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [validLessonBPages],
    });
    const job = await createGenerationJob(db, ALICE, answers);
    expect(job.status).toBe("queued");

    await runGenerationJob(db, model, job.id);

    const view = await getGenerationJobView(db, ALICE, job.id);
    expect(view?.status).toBe("done");
    expect(view?.error).toBeNull();
    expect(view?.content).not.toBeNull();
    expect(() => validateCourseContent(view!.content!)).not.toThrow();

    // The content row exists and is attributed to the user, not the catalog.
    const [row] = await db
      .select()
      .from(schema.courseContent)
      .where(eq(schema.courseContent.contentId, view!.content!.contentId));
    expect(row.isStarter).toBe(false);
    expect(row.createdBy).toBe(ALICE);
  });

  it("marks the job failed and persists no partial course", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [invalidLessonBPages],
    });
    const job = await createGenerationJob(db, ALICE, answers);
    await runGenerationJob(db, model, job.id);

    const view = await getGenerationJobView(db, ALICE, job.id);
    expect(view?.status).toBe("failed");
    expect(view?.error).toContain("Lesson B");
    expect(view?.content).toBeNull();
    expect(await db.select().from(schema.courseContent)).toHaveLength(0);
  });

  it("does not re-run a job that already left the queued state", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [validLessonBPages],
    });
    const job = await createGenerationJob(db, ALICE, answers);
    await runGenerationJob(db, model, job.id);
    const callsAfterFirst = model.calls.length;
    await runGenerationJob(db, model, job.id);
    expect(model.calls.length).toBe(callsAfterFirst);
  });
});

describe("getGenerationJobView", () => {
  it("hides other users' jobs", async () => {
    const job = await createGenerationJob(db, ALICE, answers);
    expect(await getGenerationJobView(db, BOB, job.id)).toBeNull();
    expect(await getGenerationJobView(db, ALICE, job.id)).not.toBeNull();
  });
});
