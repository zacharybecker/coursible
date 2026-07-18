// The generation pipeline: one outline call, then one call per lesson with
// limited parallelism, validating each lesson as it lands and regenerating
// failures with the concrete validation errors appended (repair loop,
// bounded). No partial course ever escapes: the assembled course must pass
// the full schema-v2 validator or the run throws.

import type {
  CourseContent,
  GenerationJobStatus,
  Lesson,
  Page,
  WizardAnswers,
} from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";
import {
  availableConceptsByLesson,
  conceptsTaughtIn,
  lessonPedagogyIssues,
} from "@/lib/validation/pedagogy";
import { GENERATION_MODEL } from "./client";
import type { ModelClient } from "./model";
import { LESSON_SYSTEM, OUTLINE_SYSTEM, lessonUserPrompt, outlineUserPrompt } from "./prompts";
import {
  lessonPagesSchema,
  outlineSchema,
  type GeneratedPage,
  type Outline,
  type OutlineLesson,
} from "./schemas";

const LESSON_CONCURRENCY = 3;
/** 1 initial attempt + 2 repairs. */
const LESSON_ATTEMPTS = 3;
const OUTLINE_MAX_TOKENS = 16000;
const LESSON_MAX_TOKENS = 16000;

/** XP is server-assigned by question type — the model never sets it. */
export const XP_BY_QUESTION_TYPE = {
  multiple_choice: 10,
  matching: 15,
  typing: 10,
  open_ended: 20,
} as const;

export interface GenerateCourseOptions {
  /** Override the minted contentId (used by the starter-course script). */
  contentId?: string;
  onStatus?: (status: GenerationJobStatus) => void | Promise<void>;
}

export async function generateCourse(
  model: ModelClient,
  answers: WizardAnswers,
  options: GenerateCourseOptions = {},
): Promise<CourseContent> {
  await options.onStatus?.("outlining");
  const outline = await model.generate({
    model: GENERATION_MODEL,
    maxTokens: OUTLINE_MAX_TOKENS,
    system: OUTLINE_SYSTEM,
    user: outlineUserPrompt(answers),
    schema: outlineSchema,
    thinking: true,
  });

  await options.onStatus?.("generating");
  const availability = availableConceptsByLesson(
    outline.skillNodes,
    outline.lessons.map((l) => ({ skillNodeId: l.skillNodeId, concepts: new Set(l.conceptIds) })),
  );
  const lessons = await mapWithConcurrency(outline.lessons, LESSON_CONCURRENCY, (brief, i) =>
    generateLessonWithRepair(model, outline, brief, availability[i]),
  );

  await options.onStatus?.("validating");
  return validateCourseContent(assembleCourse(outline, lessons, options.contentId));
}

async function generateLessonWithRepair(
  model: ModelClient,
  outline: Outline,
  brief: OutlineLesson,
  availableBefore: ReadonlySet<string>,
): Promise<Lesson> {
  const allConceptIds = new Set(outline.concepts.map((c) => c.id));
  let errors: string[] = [];
  for (let attempt = 0; attempt < LESSON_ATTEMPTS; attempt++) {
    let generated: { pages: GeneratedPage[] };
    try {
      generated = await model.generate({
        model: GENERATION_MODEL,
        maxTokens: LESSON_MAX_TOKENS,
        system: LESSON_SYSTEM,
        user: lessonUserPrompt(outline, brief, availableBefore, errors),
        schema: lessonPagesSchema,
        thinking: true,
      });
    } catch (err) {
      errors = [
        `The response failed schema validation: ${err instanceof Error ? err.message : String(err)}`,
      ];
      continue;
    }
    const lesson = buildLesson(brief, generated.pages);
    errors = checkLesson(lesson, brief, availableBefore, allConceptIds);
    if (errors.length === 0) return lesson;
  }
  throw new Error(
    `Lesson "${brief.title}" failed validation after ${LESSON_ATTEMPTS} attempts:\n${errors
      .map((e) => `- ${e}`)
      .join("\n")}`,
  );
}

/** Repair-loop checks: per-lesson pedagogy plus assigned-concept coverage. */
function checkLesson(
  lesson: Lesson,
  brief: OutlineLesson,
  availableBefore: ReadonlySet<string>,
  allConceptIds: ReadonlySet<string>,
): string[] {
  const errors = lessonPedagogyIssues(lesson, availableBefore, allConceptIds).map(
    (issue) => issue.message,
  );
  const taught = conceptsTaughtIn(lesson);
  for (const conceptId of brief.conceptIds) {
    if (!taught.has(conceptId)) {
      errors.push(
        `assigned concept "${conceptId}" is not taught by any content page in this lesson`,
      );
    }
  }
  return errors;
}

/** Inject deterministic page ids and server-assigned XP. */
function buildLesson(brief: OutlineLesson, pages: GeneratedPage[]): Lesson {
  return {
    id: brief.id,
    title: brief.title,
    description: brief.description,
    skillNodeId: brief.skillNodeId,
    estimatedMinutes: Math.max(1, brief.estimatedMinutes),
    pages: pages.map((page, i): Page => {
      const id = `${brief.id}-p${i + 1}`;
      switch (page.type) {
        case "text":
        case "diagram":
          return { ...page, id };
        case "multiple_choice":
        case "matching":
        case "typing":
        case "open_ended":
          return { ...page, id, xp: XP_BY_QUESTION_TYPE[page.type] };
      }
    }),
  };
}

function assembleCourse(outline: Outline, lessons: Lesson[], contentId?: string): CourseContent {
  return {
    contentId: contentId ?? `content-${crypto.randomUUID()}`,
    schemaVersion: 2,
    title: outline.title,
    description: outline.description,
    outcome: outline.outcome,
    tags: outline.tags,
    estimatedHours: Math.max(1, outline.estimatedHours),
    concepts: outline.concepts,
    skillNodes: outline.skillNodes.map((node) => ({
      ...node,
      lessonIds: lessons.filter((l) => l.skillNodeId === node.id).map((l) => l.id),
    })),
    lessons,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
