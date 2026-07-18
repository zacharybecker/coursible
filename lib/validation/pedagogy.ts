// Pure pedagogy checks shared by the Zod validator (course-level) and the
// generation pipeline (per-lesson, during the repair loop). Kept free of Zod
// so the pipeline can turn issues straight into repair-prompt text.

import {
  isContentPage,
  type Lesson,
  type SkillNode,
} from "@/lib/types";

export interface PedagogyIssue {
  /** Path relative to the object checked (lesson for lesson checks). */
  path: (string | number)[];
  message: string;
}

/** Concept ids taught by a lesson's content pages. */
export function conceptsTaughtIn(lesson: Lesson): Set<string> {
  const taught = new Set<string>();
  for (const page of lesson.pages) {
    if (isContentPage(page)) for (const id of page.teaches) taught.add(id);
  }
  return taught;
}

/**
 * Checks local to one lesson, given the concepts available before it starts:
 * unknown concept refs, teach-before-test within the lesson, question-first,
 * content-page minimum, MCQ option resolution and distractor shape.
 */
export function lessonPedagogyIssues(
  lesson: Lesson,
  availableBefore: ReadonlySet<string>,
  allConceptIds: ReadonlySet<string>,
): PedagogyIssue[] {
  const issues: PedagogyIssue[] = [];
  const taughtSoFar = new Set(availableBefore);
  let contentPages = 0;
  let flaggedQuestionFirst = false;

  lesson.pages.forEach((page, i) => {
    const refField = isContentPage(page) ? "teaches" : "tests";
    const refs = isContentPage(page) ? page.teaches : page.tests;
    refs.forEach((conceptId, j) => {
      if (!allConceptIds.has(conceptId)) {
        issues.push({
          path: ["pages", i, refField, j],
          message: `unknown concept "${conceptId}"`,
        });
      }
    });

    if (isContentPage(page)) {
      contentPages++;
      for (const id of page.teaches) taughtSoFar.add(id);
      return;
    }

    if (contentPages === 0 && !flaggedQuestionFirst) {
      flaggedQuestionFirst = true;
      issues.push({
        path: ["pages", i],
        message: `lesson "${lesson.id}" has a question page before any content page`,
      });
    }
    page.tests.forEach((conceptId, j) => {
      if (allConceptIds.has(conceptId) && !taughtSoFar.has(conceptId)) {
        issues.push({
          path: ["pages", i, "tests", j],
          message: `question "${page.id}" tests concept "${conceptId}" before it is taught`,
        });
      }
    });

    if (page.type === "multiple_choice") {
      if (!page.options.some((o) => o.id === page.correctOptionId)) {
        issues.push({
          path: ["pages", i, "correctOptionId"],
          message: `correctOptionId "${page.correctOptionId}" matches no option`,
        });
      }
      page.options.forEach((option, j) => {
        const isCorrect = option.id === page.correctOptionId;
        if (!isCorrect && !option.misconception?.trim()) {
          issues.push({
            path: ["pages", i, "options", j],
            message: `incorrect option "${option.id}" is missing a misconception`,
          });
        }
        if (isCorrect && option.misconception !== undefined) {
          issues.push({
            path: ["pages", i, "options", j],
            message: `correct option "${option.id}" must not have a misconception`,
          });
        }
      });
    }
  });

  if (contentPages < 2) {
    issues.push({
      path: ["pages"],
      message: `lesson "${lesson.id}" has ${contentPages} content page(s); minimum is 2`,
    });
  }
  return issues;
}

/**
 * For each lesson (in course order), the concept ids available before it
 * starts: concepts from earlier lessons of the same skill node plus concepts
 * from ALL lessons of (transitively) prerequisite nodes.
 */
export function availableConceptsByLesson(
  skillNodes: Pick<SkillNode, "id" | "prereqIds">[],
  lessons: { skillNodeId: string; concepts: ReadonlySet<string> }[],
): Set<string>[] {
  const prereqsOf = new Map(skillNodes.map((n) => [n.id, n.prereqIds]));

  const transitiveCache = new Map<string, Set<string>>();
  function transitivePrereqs(nodeId: string): Set<string> {
    const cached = transitiveCache.get(nodeId);
    if (cached) return cached;
    const result = new Set<string>();
    const stack = [...(prereqsOf.get(nodeId) ?? [])];
    while (stack.length > 0) {
      const next = stack.pop()!;
      if (result.has(next)) continue; // also guards against cycles
      result.add(next);
      stack.push(...(prereqsOf.get(next) ?? []));
    }
    transitiveCache.set(nodeId, result);
    return result;
  }

  const conceptsByNode = new Map<string, Set<string>>();
  for (const lesson of lessons) {
    const set = conceptsByNode.get(lesson.skillNodeId) ?? new Set<string>();
    for (const id of lesson.concepts) set.add(id);
    conceptsByNode.set(lesson.skillNodeId, set);
  }

  const earlierInNode = new Map<string, Set<string>>();
  return lessons.map((lesson) => {
    const available = new Set<string>();
    for (const nodeId of transitivePrereqs(lesson.skillNodeId)) {
      for (const id of conceptsByNode.get(nodeId) ?? []) available.add(id);
    }
    for (const id of earlierInNode.get(lesson.skillNodeId) ?? []) available.add(id);

    const seen = earlierInNode.get(lesson.skillNodeId) ?? new Set<string>();
    for (const id of lesson.concepts) seen.add(id);
    earlierInNode.set(lesson.skillNodeId, seen);
    return available;
  });
}

/**
 * Course-level pedagogy checks: per-lesson checks with cross-lesson/prereq
 * availability, plus coverage (every concept taught somewhere).
 * Assumes the prereq graph is already known to be a DAG.
 */
export function coursePedagogyIssues(content: {
  concepts: { id: string }[];
  skillNodes: Pick<SkillNode, "id" | "prereqIds">[];
  lessons: Lesson[];
}): PedagogyIssue[] {
  const issues: PedagogyIssue[] = [];
  const allConceptIds = new Set(content.concepts.map((c) => c.id));

  const available = availableConceptsByLesson(
    content.skillNodes,
    content.lessons.map((l) => ({ skillNodeId: l.skillNodeId, concepts: conceptsTaughtIn(l) })),
  );
  content.lessons.forEach((lesson, li) => {
    for (const issue of lessonPedagogyIssues(lesson, available[li], allConceptIds)) {
      issues.push({ path: ["lessons", li, ...issue.path], message: issue.message });
    }
  });

  const taughtAnywhere = new Set<string>();
  for (const lesson of content.lessons) {
    for (const id of conceptsTaughtIn(lesson)) taughtAnywhere.add(id);
  }
  content.concepts.forEach((concept, i) => {
    if (!taughtAnywhere.has(concept.id)) {
      issues.push({
        path: ["concepts", i],
        message: `concept "${concept.id}" is never taught by any content page`,
      });
    }
  });
  return issues;
}
