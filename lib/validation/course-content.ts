// Zod schema for the controlled-JSON course content, schema v2. Applied to
// every course_content write (seed script, addCourseToLibrary, generation
// pipeline). Beyond shape it enforces referential integrity (prereq ids
// resolve and form a DAG, lessons point at real skill nodes, concept refs
// resolve) and the pedagogy rules (teach-before-test, coverage, teaching
// minimums, distractor shape) via lib/validation/pedagogy.ts.

import { z } from "zod";
import type { CourseContent } from "@/lib/types";
import { coursePedagogyIssues } from "./pedagogy";

const conceptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const contentPageBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  teaches: z.array(z.string().min(1)),
};

const textPage = z.object({
  type: z.literal("text"),
  ...contentPageBase,
  body: z.string().min(1),
});

const diagramPage = z.object({
  type: z.literal("diagram"),
  ...contentPageBase,
  intro: z.string().optional(),
  mermaid: z.string().min(1),
  caption: z.string().min(1),
});

const videoPage = z.object({
  type: z.literal("video"),
  ...contentPageBase,
  searchQuery: z.string().min(1),
  shouldCover: z.string().min(1),
  videoId: z.string().nullable(),
});

const questionPageBase = {
  id: z.string().min(1),
  prompt: z.string().min(1),
  tests: z.array(z.string().min(1)).min(1),
  explanation: z.string(),
  xp: z.number().int().positive(),
};

const multipleChoiceOption = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  misconception: z.string().min(1).optional(),
});

const multipleChoicePage = z.object({
  type: z.literal("multiple_choice"),
  ...questionPageBase,
  context: z.string().optional(),
  options: z.array(multipleChoiceOption).min(2).max(5),
  correctOptionId: z.string().min(1),
});

const matchingPage = z.object({
  type: z.literal("matching"),
  ...questionPageBase,
  pairs: z
    .array(z.object({ id: z.string().min(1), left: z.string().min(1), right: z.string().min(1) }))
    .min(3)
    .max(6),
});

const typingPage = z.object({
  type: z.literal("typing"),
  ...questionPageBase,
  acceptableAnswers: z.array(z.string().min(1)).min(1),
  hint: z.string().optional(),
});

const openEndedPage = z.object({
  type: z.literal("open_ended"),
  ...questionPageBase,
  rubric: z.object({
    keyPoints: z.array(z.string().min(1)).min(1),
    commonMisconceptions: z.array(z.string().min(1)),
    sampleAnswer: z.string().min(1),
  }),
});

const page = z.discriminatedUnion("type", [
  textPage,
  diagramPage,
  videoPage,
  multipleChoicePage,
  matchingPage,
  typingPage,
  openEndedPage,
]);

const lesson = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  skillNodeId: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  pages: z.array(page).min(1),
});

const skillNode = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  prereqIds: z.array(z.string().min(1)),
  lessonIds: z.array(z.string().min(1)),
  position: z.object({ col: z.number().int(), row: z.number().int() }),
});

/** True if the prereq graph has a cycle (DFS three-color). */
function hasCycle(nodes: { id: string; prereqIds: string[] }[]): boolean {
  const edges = new Map(nodes.map((n) => [n.id, n.prereqIds]));
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string): boolean => {
    const s = state.get(id);
    if (s === "visiting") return true;
    if (s === "done") return false;
    state.set(id, "visiting");
    for (const prereq of edges.get(id) ?? []) {
      if (visit(prereq)) return true;
    }
    state.set(id, "done");
    return false;
  };
  return nodes.some((n) => visit(n.id));
}

export const courseContentSchema: z.ZodType<CourseContent> = z
  .object({
    contentId: z.string().min(1),
    schemaVersion: z.literal(2),
    title: z.string().min(1),
    description: z.string(),
    outcome: z.string(),
    tags: z.array(z.string().min(1)),
    estimatedHours: z.number().int().positive(),
    concepts: z.array(conceptSchema).min(1),
    skillNodes: z.array(skillNode).min(1),
    lessons: z.array(lesson).min(1),
  })
  .superRefine((content, ctx) => {
    const nodeIds = new Set(content.skillNodes.map((n) => n.id));

    content.skillNodes.forEach((node, i) => {
      node.prereqIds.forEach((prereqId, j) => {
        if (!nodeIds.has(prereqId)) {
          ctx.addIssue({
            code: "custom",
            path: ["skillNodes", i, "prereqIds", j],
            message: `prereq "${prereqId}" matches no skill node`,
          });
        }
      });
    });

    if (hasCycle(content.skillNodes)) {
      ctx.addIssue({
        code: "custom",
        path: ["skillNodes"],
        message: "prereq graph contains a cycle",
      });
      return; // pedagogy checks assume a DAG
    }

    let badNodeRef = false;
    content.lessons.forEach((l, i) => {
      if (!nodeIds.has(l.skillNodeId)) {
        badNodeRef = true;
        ctx.addIssue({
          code: "custom",
          path: ["lessons", i, "skillNodeId"],
          message: `lesson "${l.id}" points at unknown skill node "${l.skillNodeId}"`,
        });
      }
    });
    if (badNodeRef) return;

    for (const issue of coursePedagogyIssues(content)) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
  });

/** Parse unknown input into CourseContent; throws ZodError on failure. */
export function validateCourseContent(input: unknown): CourseContent {
  return courseContentSchema.parse(input);
}
