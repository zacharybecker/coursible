// @vitest-environment node
// Grading unit tests with a stubbed ModelClient: prompt assembly, verdict
// passthrough, and the graceful fallback on API failure.

import { describe, expect, it, vi } from "vitest";
import type { OpenEndedPage } from "@/lib/types";
import type { GenerateParams, ModelClient } from "./model";
import { GRADING_MODEL } from "./client";
import { gradeOpenEndedAnswer, gradeWithFallback } from "./grading";

const page: OpenEndedPage = {
  type: "open_ended",
  id: "p1",
  prompt: "Explain how a teammate gets your image.",
  tests: ["c-registry"],
  explanation: "",
  xp: 20,
  rubric: {
    keyPoints: ["Push to a registry", "Teammate pulls from the registry"],
    commonMisconceptions: ["Emailing the Dockerfile shares the image"],
    sampleAnswer: "Push it to a registry; they pull it by name.",
  },
};

function stubModel(result: unknown): ModelClient & { calls: GenerateParams<unknown>[] } {
  const calls: GenerateParams<unknown>[] = [];
  return {
    calls,
    async generate<T>(params: GenerateParams<T>): Promise<T> {
      calls.push(params as GenerateParams<unknown>);
      return result as T;
    },
  };
}

describe("gradeOpenEndedAnswer", () => {
  it("sends the rubric and answer to the grading model and returns its verdict", async () => {
    const grade = { verdict: "pass", feedback: "Nice.", missedKeyPoints: [] };
    const model = stubModel(grade);
    const result = await gradeOpenEndedAnswer(model, page, "Push it to a registry, they pull it.");
    expect(result).toEqual(grade);
    expect(model.calls).toHaveLength(1);
    const call = model.calls[0];
    expect(call.model).toBe(GRADING_MODEL);
    expect(call.user).toContain("Push to a registry");
    expect(call.user).toContain("Emailing the Dockerfile");
    expect(call.user).toContain("Push it to a registry, they pull it.");
  });
});

describe("gradeWithFallback", () => {
  it("wraps a successful grade", async () => {
    const model = stubModel({
      verdict: "partial",
      feedback: "Some gaps.",
      missedKeyPoints: ["Push to a registry"],
    });
    const result = await gradeWithFallback(model, page, "They download it.");
    expect(result).toEqual({
      ok: true,
      grade: { verdict: "partial", feedback: "Some gaps.", missedKeyPoints: ["Push to a registry"] },
    });
  });

  it("returns the fallback marker when the model call fails", async () => {
    const model: ModelClient = {
      generate: vi.fn().mockRejectedValue(new Error("529 overloaded")),
    };
    const result = await gradeWithFallback(model, page, "Answer.");
    expect(result).toEqual({ ok: false, fallback: true });
  });
});
