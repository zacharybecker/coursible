// Canned pipeline inputs and a stub ModelClient — imported only by tests
// (pipeline.test.ts, jobs.test.ts). Routing: outline calls are recognized by
// schema identity; lesson calls by the "Lesson id: <id>" line the prompt
// builder always emits.

import type { GenerateParams, ModelClient } from "./model";
import { outlineSchema, type Outline } from "./schemas";

export const stubOutline: Outline = {
  title: "Docker Fundamentals",
  description: "Learn Docker from scratch.",
  outcome: "Ship an app in a container.",
  tags: ["docker", "devops"],
  estimatedHours: 2,
  concepts: [
    { id: "c-one", name: "Concept one" },
    { id: "c-two", name: "Concept two" },
    { id: "c-three", name: "Concept three" },
  ],
  skillNodes: [
    { id: "node-a", title: "A", description: "First node", prereqIds: [], position: { col: 0, row: 0 } },
    { id: "node-b", title: "B", description: "Second node", prereqIds: ["node-a"], position: { col: 1, row: 0 } },
  ],
  lessons: [
    {
      id: "lesson-a",
      title: "Lesson A",
      description: "Teaches one and two",
      skillNodeId: "node-a",
      estimatedMinutes: 10,
      conceptIds: ["c-one", "c-two"],
    },
    {
      id: "lesson-b",
      title: "Lesson B",
      description: "Teaches three",
      skillNodeId: "node-b",
      estimatedMinutes: 10,
      conceptIds: ["c-three"],
    },
  ],
};

export const validLessonAPages = {
  pages: [
    { type: "text", title: "One", body: "All about **one**.", teaches: ["c-one"] },
    { type: "text", title: "Two", body: "All about **two**.", teaches: ["c-two"] },
    {
      type: "multiple_choice",
      prompt: "What is one?",
      tests: ["c-one"],
      explanation: "One is one.",
      options: [
        { id: "a", text: "The right answer" },
        { id: "b", text: "A wrong answer", misconception: "Mixes up one and two" },
      ],
      correctOptionId: "a",
    },
  ],
};

export const validLessonBPages = {
  pages: [
    { type: "text", title: "Three", body: "All about three.", teaches: ["c-three"] },
    { type: "text", title: "Recap", body: "A recap.", teaches: [] },
    {
      type: "typing",
      prompt: "What is three?",
      tests: ["c-three"],
      explanation: "Three is three.",
      acceptableAnswers: ["three"],
    },
  ],
};

/** Violates: question first, teach-before-test, and the 2-content-page minimum. */
export const invalidLessonBPages = {
  pages: [
    {
      type: "typing",
      prompt: "What is three?",
      tests: ["c-three"],
      explanation: "Three is three.",
      acceptableAnswers: ["three"],
    },
    { type: "text", title: "Three", body: "All about three.", teaches: ["c-three"] },
  ],
};

export function makeStubModel(
  outline: unknown,
  lessonResponses: Record<string, unknown[]>,
): ModelClient & { calls: GenerateParams<unknown>[] } {
  const attemptCounts = new Map<string, number>();
  const calls: GenerateParams<unknown>[] = [];
  return {
    calls,
    async generate<T>(params: GenerateParams<T>): Promise<T> {
      calls.push(params as GenerateParams<unknown>);
      if ((params.schema as unknown) === outlineSchema) return outline as T;
      const lessonId = Object.keys(lessonResponses).find((id) =>
        params.user.includes(`Lesson id: ${id}`),
      );
      if (!lessonId) throw new Error("stub: no lesson response matches this prompt");
      const attempt = attemptCounts.get(lessonId) ?? 0;
      attemptCounts.set(lessonId, attempt + 1);
      const responses = lessonResponses[lessonId];
      return responses[Math.min(attempt, responses.length - 1)] as T;
    },
  };
}

export function lessonCallsFor(
  calls: GenerateParams<unknown>[],
  lessonId: string,
): GenerateParams<unknown>[] {
  return calls.filter((c) => c.user.includes(`Lesson id: ${lessonId}`));
}
