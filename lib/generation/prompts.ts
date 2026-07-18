// Prompt builders for the generation pipeline. The pedagogy rules stated
// here are the same ones the validator enforces mechanically — the prompt
// makes the model likely to comply; the validator + repair loop guarantee it.

import type { WizardAnswers } from "@/lib/types";
import type { Outline, OutlineLesson } from "./schemas";

export const OUTLINE_SYSTEM = `You are an expert curriculum designer for a self-paced learning app.

You design a course outline from a learner's goal. The course is structured as:
- skillNodes: a small branching tech-tree of skills. prereqIds form a DAG. position.col is depth (0 = starting skills), position.row separates parallel branches (0, 1, 2, ...).
- lessons: each belongs to exactly one skill node (1-4 lessons per node), listed in the order they should be studied.
- concepts: the flat list of atomic ideas the whole course teaches. Concepts are the spine of the course — every lesson page will later declare which concepts it teaches or tests.

Rules:
- 3-7 skill nodes, 6-14 lessons total, 8-30 concepts.
- Every lesson lists conceptIds: the concepts that lesson INTRODUCES (1-4 per lesson). Every concept must be introduced by exactly one lesson.
- Order lessons so knowledge builds: a lesson may assume only concepts introduced in earlier lessons of the same skill node, or in (transitively) prerequisite nodes. Never assign a concept to a lesson whose node cannot see the concepts it builds on.
- estimatedMinutes per lesson must fit the learner's stated schedule; estimatedHours is the realistic whole-hour total.
- ids are short unique kebab-case slugs: nodes "node-...", lessons "lesson-...", concepts "c-...".
- tags: 2-4 short topical tags.
- Calibrate depth to the learner's starting knowledge; the description sells the outcome in one or two sentences.`;

export function outlineUserPrompt(answers: WizardAnswers): string {
  return [
    `The learner's goal (real-world outcome): ${answers.outcome}`,
    `Starting knowledge: ${answers.knowledge}`,
    `Time available: ${answers.time}`,
    `Preferred learning style: ${answers.style}`,
    answers.sources.length > 0
      ? `The learner uploaded ${answers.sources.length} reference file(s) (${answers.sources.join(", ")}) — file contents are not available, design from the goal alone.`
      : "",
    "",
    "Design the course outline.",
  ]
    .filter(Boolean)
    .join("\n");
}

export const LESSON_SYSTEM = `You write one lesson for a self-paced learning app as an ordered sequence of pages.

Content pages (teach; each carries "teaches": the concept ids it substantively teaches — may be empty for pure narrative/transition pages):
- text: title + body. Markdown subset ONLY: paragraphs separated by blank lines, **bold**, \`inline code\`, headings (#, ##, ###), and "- " bullet lists. No links, no images, no tables.
- diagram: title, optional one-sentence intro, mermaid (valid Mermaid source — prefer a simple "flowchart TD"/"flowchart LR" or "sequenceDiagram", at most ~10 nodes, no styling directives), caption explaining what to notice.

Question pages (test; each carries "tests": the concept ids it tests, and "explanation": shown after answering):
- multiple_choice: optional context (scenario framing), 2-5 options with short unique ids, correctOptionId.
- matching: 3-6 pairs (short unique pair ids); the learner matches left to right.
- typing: short free-recall answer. acceptableAnswers must list EVERY acceptable phrasing (matched case- and whitespace-insensitively); optional hint.
- open_ended: an "explain it in your own words" prompt, graded later by an AI against your rubric: keyPoints (2-5 independently checkable points a good answer makes), commonMisconceptions, sampleAnswer.

Pedagogy rules — these are mechanically validated and violations are rejected:
1. Teach before you test: a question page may only test concepts taught by a content page EARLIER in this lesson, or concepts listed as already taught.
2. Teach every assigned concept with substantive content (a real explanation with an example — not a passing mention) before any question tests it.
3. At least one content page before the first question page; at least 2 content pages total.
4. Every incorrect multiple_choice option MUST include "misconception": the specific plausible confusion that would lead a learner to pick it. The correct option must NOT have a misconception field. Distractors must match the correct answer's length and specificity. No joke options, no "all of the above".
5. Interleave: teach a concept, then test it soon after — don't stack all questions at the end.

Aim for 5-9 pages. Write in second person, concrete and example-driven. Vary question types.`;

export function lessonUserPrompt(
  outline: Outline,
  brief: OutlineLesson,
  alreadyTaught: ReadonlySet<string>,
  previousErrors: string[],
): string {
  const nameOf = new Map(outline.concepts.map((c) => [c.id, c.name]));
  const toTeach = brief.conceptIds.map((id) => `- ${id} — ${nameOf.get(id) ?? id}`);
  const taught = [...alreadyTaught].map((id) => `- ${id} — ${nameOf.get(id) ?? id}`);

  const parts = [
    `Course: ${outline.title} — ${outline.outcome}`,
    `Lesson id: ${brief.id}`,
    `Lesson: ${brief.title} — ${brief.description} (~${brief.estimatedMinutes} minutes)`,
    "",
    "Concepts THIS lesson must teach (teach every one of them):",
    ...(toTeach.length > 0 ? toTeach : ["(none — this is a practice lesson)"]),
    "",
    "Concepts already taught earlier in the course (you may test these; don't re-teach them at length):",
    ...(taught.length > 0 ? taught : ["(none — this is the first lesson)"]),
  ];

  if (previousErrors.length > 0) {
    parts.push(
      "",
      "Your previous attempt was rejected by the validator. Fix ALL of these errors:",
      ...previousErrors.map((e) => `- ${e}`),
    );
  }

  parts.push("", "Write the lesson's full page sequence.");
  return parts.join("\n");
}
