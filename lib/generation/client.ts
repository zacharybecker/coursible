// Singleton Anthropic-backed ModelClient plus the model choices for this
// app. Opus for generation quality; Haiku for grading (deliberate: grading
// runs on every answer, latency must be low, and the rubric does the heavy
// lifting). Reads ANTHROPIC_API_KEY from the environment.

import Anthropic from "@anthropic-ai/sdk";
import { anthropicModelClient, type ModelClient } from "./model";

export const GENERATION_MODEL = "claude-opus-4-8";
export const GRADING_MODEL = "claude-haiku-4-5";

let cached: ModelClient | null = null;

export function getModelClient(): ModelClient {
  if (!cached) cached = anthropicModelClient(new Anthropic());
  return cached;
}
