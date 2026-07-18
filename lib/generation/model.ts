// Thin abstraction over the Anthropic SDK's structured-output call so the
// pipeline and grading code can be tested with a stub. Every LLM call in the
// app goes through ModelClient.generate: the model fills out a Zod schema
// via structured outputs (client.messages.parse + zodOutputFormat) — it
// never invents structure.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export interface GenerateParams<T> {
  model: string;
  maxTokens: number;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** Enable adaptive thinking (used for Opus generation calls, not grading). */
  thinking?: boolean;
}

export interface ModelClient {
  generate<T>(params: GenerateParams<T>): Promise<T>;
}

export function anthropicModelClient(client: Anthropic): ModelClient {
  return {
    async generate({ model, maxTokens, system, user, schema, thinking }) {
      const response = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        system,
        ...(thinking ? { thinking: { type: "adaptive" as const } } : {}),
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(schema) },
      });
      if (response.parsed_output == null) {
        throw new Error(
          `Model returned no parseable output (stop_reason: ${response.stop_reason})`,
        );
      }
      return response.parsed_output;
    },
  };
}
