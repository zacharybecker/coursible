// Kicks off course generation. The generation itself runs AFTER the response
// via next/server `after`, so the wizard gets its job id immediately and the
// work survives the request (on Vercel, `after` maps to waitUntil and runs
// up to maxDuration; locally the Node server just keeps going). Progress is
// reported through the generation_jobs row, which the wizard polls.

import { after } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wizardAnswersSchema } from "@/lib/validation/wizard-answers";
import { getModelClient } from "@/lib/generation/client";
import { createGenerationJob, runGenerationJob } from "@/lib/generation/jobs";

export const maxDuration = 800;

export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = wizardAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid answers" }, { status: 400 });
  }

  const job = await createGenerationJob(db, session.user.id, parsed.data);
  after(() => runGenerationJob(db, getModelClient(), job.id));
  return Response.json({ jobId: job.id });
}
