// Zod schema for the controlled-JSON course content. Applied to every
// course_content write (seed script, addCourseToLibrary) and reused by the
// slice-2 generation pipeline. Beyond shape, it enforces referential
// integrity: prereq ids resolve and form a DAG, lessons and activities point
// at real skill nodes, and every question's correctOptionId is a real option.

import { z } from "zod";
import type { CourseContent } from "@/lib/types";

const knowledgeCheckOption = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const knowledgeCheckQuestion = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    options: z.array(knowledgeCheckOption).min(2),
    correctOptionId: z.string().min(1),
    explanation: z.string(),
  })
  .superRefine((q, ctx) => {
    if (!q.options.some((o) => o.id === q.correctOptionId)) {
      ctx.addIssue({
        code: "custom",
        path: ["correctOptionId"],
        message: `correctOptionId "${q.correctOptionId}" matches no option`,
      });
    }
  });

const activityBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  skillNodeId: z.string().min(1),
  xp: z.number().int().positive(),
};

const explanationCheck = z.object({
  type: z.literal("explanation_check"),
  ...activityBase,
  content: z.string().min(1),
  questions: z.array(knowledgeCheckQuestion).min(1),
});

const scenarioChoice = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  outcome: z.string(),
  rationale: z.string(),
  correct: z.boolean(),
});

const scenarioDecision = z
  .object({
    type: z.literal("scenario_decision"),
    ...activityBase,
    scenario: z.string().min(1),
    choices: z.array(scenarioChoice).min(2),
  })
  .superRefine((a, ctx) => {
    if (!a.choices.some((c) => c.correct)) {
      ctx.addIssue({
        code: "custom",
        path: ["choices"],
        message: "scenario has no correct choice",
      });
    }
  });

const checklistItem = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const appliedTask = z
  .object({
    type: z.literal("applied_task"),
    ...activityBase,
    prompt: z.string().min(1),
    submissionType: z.enum(["command", "checklist"]),
    expectedPatterns: z.array(z.string().min(1)).optional(),
    checklist: z.array(checklistItem).min(1).optional(),
    successFeedback: z.string(),
    reviewFeedback: z.string(),
  })
  .superRefine((a, ctx) => {
    if (a.submissionType === "command" && !a.expectedPatterns?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedPatterns"],
        message: "command submission requires expectedPatterns",
      });
    }
    if (a.submissionType === "checklist" && !a.checklist?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["checklist"],
        message: "checklist submission requires checklist items",
      });
    }
  });

const tutorSampleMessage = z.object({
  role: z.enum(["tutor", "learner"]),
  text: z.string().min(1),
});

const aiTutorConversation = z.object({
  type: z.literal("ai_tutor_conversation"),
  ...activityBase,
  description: z.string().min(1),
  sampleMessages: z.array(tutorSampleMessage),
});

const spacedReview = z.object({
  type: z.literal("spaced_review"),
  ...activityBase,
  description: z.string().min(1),
  reviewItems: z.array(z.string().min(1)),
});

const activity = z.discriminatedUnion("type", [
  explanationCheck,
  scenarioDecision,
  appliedTask,
  aiTutorConversation,
  spacedReview,
]);

const lesson = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  skillNodeId: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  activities: z.array(activity).min(1),
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
    title: z.string().min(1),
    description: z.string(),
    outcome: z.string(),
    tags: z.array(z.string().min(1)),
    estimatedHours: z.number().int().positive(),
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
    }

    content.lessons.forEach((l, i) => {
      if (!nodeIds.has(l.skillNodeId)) {
        ctx.addIssue({
          code: "custom",
          path: ["lessons", i, "skillNodeId"],
          message: `lesson "${l.id}" points at unknown skill node "${l.skillNodeId}"`,
        });
      }
      l.activities.forEach((a, j) => {
        if (!nodeIds.has(a.skillNodeId)) {
          ctx.addIssue({
            code: "custom",
            path: ["lessons", i, "activities", j, "skillNodeId"],
            message: `activity "${a.id}" points at unknown skill node "${a.skillNodeId}"`,
          });
        }
      });
    });
  });

/** Parse unknown input into CourseContent; throws ZodError on failure. */
export function validateCourseContent(input: unknown): CourseContent {
  return courseContentSchema.parse(input);
}
