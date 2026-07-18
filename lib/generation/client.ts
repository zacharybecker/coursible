// Singleton ModelClient plus the model choices for this app. Two providers:
// Kimi (Moonshot AI, default — much cheaper at generation volume) and
// Anthropic (fallback). Select with GENERATION_PROVIDER=kimi|anthropic;
// override individual models with GENERATION_MODEL / GRADING_MODEL. Grading
// deliberately uses a fast non-thinking call: it runs on every answer and
// the rubric does the heavy lifting.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { anthropicModelClient, kimiModelClient, type ModelClient } from "./model";

type Provider = "kimi" | "anthropic";

const provider: Provider =
  process.env.GENERATION_PROVIDER === "anthropic" ? "anthropic" : "kimi";

const DEFAULT_MODELS: Record<Provider, { generation: string; grading: string }> = {
  kimi: { generation: "kimi-k2.6", grading: "kimi-k2.6" },
  anthropic: { generation: "claude-opus-4-8", grading: "claude-haiku-4-5" },
};

export const GENERATION_MODEL =
  process.env.GENERATION_MODEL ?? DEFAULT_MODELS[provider].generation;
export const GRADING_MODEL =
  process.env.GRADING_MODEL ?? DEFAULT_MODELS[provider].grading;

let cached: ModelClient | null = null;

export function getModelClient(): ModelClient {
  if (!cached) {
    cached =
      provider === "kimi"
        ? kimiModelClient(
            new OpenAI({
              apiKey: process.env.MOONSHOT_API_KEY,
              baseURL: "https://api.moonshot.ai/v1",
            }),
          )
        : anthropicModelClient(new Anthropic());
  }
  return cached;
}
