// Model-facing Zod schemas for structured outputs. The model fills these
// out; it never invents structure. Page ids and XP are intentionally absent
// — the pipeline assigns both server-side (buildLesson). Video pages are
// schema-v2-legal but never generated this slice.

import { z } from "zod";

export const outlineSchema = z.object({
  title: z.string(),
  description: z.string(),
  outcome: z.string(),
  tags: z.array(z.string()),
  estimatedHours: z.number().int(),
  concepts: z.array(z.object({ id: z.string(), name: z.string() })),
  skillNodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      prereqIds: z.array(z.string()),
      position: z.object({ col: z.number().int(), row: z.number().int() }),
    }),
  ),
  lessons: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      skillNodeId: z.string(),
      estimatedMinutes: z.number().int(),
      /** Concepts this lesson introduces (teaches for the first time). */
      conceptIds: z.array(z.string()),
    }),
  ),
});

export type Outline = z.infer<typeof outlineSchema>;
export type OutlineLesson = Outline["lessons"][number];

const generatedContentBase = {
  title: z.string(),
  teaches: z.array(z.string()),
};

const generatedTextPage = z.object({
  type: z.literal("text"),
  ...generatedContentBase,
  body: z.string(),
});

const generatedDiagramPage = z.object({
  type: z.literal("diagram"),
  ...generatedContentBase,
  intro: z.string().optional(),
  mermaid: z.string(),
  caption: z.string(),
});

const generatedQuestionBase = {
  prompt: z.string(),
  tests: z.array(z.string()),
  explanation: z.string(),
};

const generatedMultipleChoicePage = z.object({
  type: z.literal("multiple_choice"),
  ...generatedQuestionBase,
  context: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      misconception: z.string().optional(),
    }),
  ),
  correctOptionId: z.string(),
});

const generatedMatchingPage = z.object({
  type: z.literal("matching"),
  ...generatedQuestionBase,
  pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })),
});

const generatedTypingPage = z.object({
  type: z.literal("typing"),
  ...generatedQuestionBase,
  acceptableAnswers: z.array(z.string()),
  hint: z.string().optional(),
});

const generatedOpenEndedPage = z.object({
  type: z.literal("open_ended"),
  ...generatedQuestionBase,
  rubric: z.object({
    keyPoints: z.array(z.string()),
    commonMisconceptions: z.array(z.string()),
    sampleAnswer: z.string(),
  }),
});

export const lessonPagesSchema = z.object({
  pages: z.array(
    z.discriminatedUnion("type", [
      generatedTextPage,
      generatedDiagramPage,
      generatedMultipleChoicePage,
      generatedMatchingPage,
      generatedTypingPage,
      generatedOpenEndedPage,
    ]),
  ),
});

export type GeneratedPage = z.infer<typeof lessonPagesSchema>["pages"][number];
