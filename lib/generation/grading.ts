// Open-ended answer grading: a fast model (GRADING_MODEL, see client.ts)
// applies the page's rubric via structured output. The rubric was fixed at
// generation time; the model only applies it. gradeWithFallback never
// throws — a provider outage must never block lesson progress (the UI
// degrades to self-assessment).

import { z } from "zod";
import type { GradeResponse, OpenEndedGrade, OpenEndedPage } from "@/lib/types";
import { GRADING_MODEL } from "./client";
import type { ModelClient } from "./model";

const gradeOutputSchema = z.object({
  verdict: z.enum(["pass", "partial", "retry"]),
  feedback: z.string(),
  missedKeyPoints: z.array(z.string()),
});

const GRADER_SYSTEM = `You grade a learner's short free-text answer against a rubric. Be encouraging but honest — never award "pass" for an answer that misses key points.

Verdicts:
- "pass": the answer covers all or nearly all key points with no major misconception.
- "partial": a genuine attempt that covers some key points but has meaningful gaps or repeats a common misconception.
- "retry": empty, off-topic, or too thin to grade — invite the learner to try again.

feedback: 1-3 sentences addressed directly to the learner ("you"), naming what was right and what was missing.
missedKeyPoints: the rubric key points the answer did not cover, copied verbatim (empty if none).`;

function gradeUserPrompt(page: OpenEndedPage, answer: string): string {
  return [
    `Question: ${page.prompt}`,
    "",
    "Rubric key points (a good answer makes these points):",
    ...page.rubric.keyPoints.map((p) => `- ${p}`),
    "",
    "Common misconceptions to watch for:",
    ...page.rubric.commonMisconceptions.map((m) => `- ${m}`),
    "",
    `Sample answer: ${page.rubric.sampleAnswer}`,
    "",
    `Learner's answer: ${answer}`,
  ].join("\n");
}

export async function gradeOpenEndedAnswer(
  model: ModelClient,
  page: OpenEndedPage,
  answer: string,
): Promise<OpenEndedGrade> {
  return model.generate({
    model: GRADING_MODEL,
    maxTokens: 1024,
    system: GRADER_SYSTEM,
    user: gradeUserPrompt(page, answer),
    schema: gradeOutputSchema,
  });
}

/** Grade, or signal the self-assessment fallback on any failure. */
export async function gradeWithFallback(
  model: ModelClient,
  page: OpenEndedPage,
  answer: string,
): Promise<GradeResponse> {
  try {
    return { ok: true, grade: await gradeOpenEndedAnswer(model, page, answer) };
  } catch {
    return { ok: false, fallback: true };
  }
}
