// Thin abstraction over provider structured-output calls so the pipeline and
// grading code can be tested with a stub. Every LLM call in the app goes
// through ModelClient.generate: the model fills out a Zod schema — it never
// invents structure. Anthropic uses native structured outputs
// (client.messages.parse + zodOutputFormat); Kimi (api.moonshot.ai) has no
// schema enforcement, so it gets JSON mode + the schema in-prompt + a Zod
// backstop — parse failures surface as errors the pipeline repair loop feeds
// back into the prompt.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { z } from "zod";

export interface GenerateParams<T> {
  model: string;
  maxTokens: number;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** Enable provider thinking mode (generation calls, not grading). */
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

// Kimi speaks the OpenAI chat-completions dialect. Schema adherence strategy:
// response_format json_object (guaranteed-valid JSON) + the JSON Schema
// inlined in the system prompt + safeParse here. With thinking enabled Kimi
// rejects a forced tool_choice, so tool-calling is not an option for
// generation calls. Temperature and friends are provider-fixed — don't set.
export function kimiModelClient(client: OpenAI): ModelClient {
  return {
    async generate({ model, maxTokens, system, user, schema, thinking }) {
      const jsonSchema = z.toJSONSchema(schema, { unrepresentable: "any" });
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: "system",
            content: `${system}\n\nRespond with a single JSON object that conforms to this JSON Schema. No prose, no code fences.\n${JSON.stringify(jsonSchema)}`,
          },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        // Kimi-only extension, absent from the OpenAI types.
        thinking: { type: thinking ? "enabled" : "disabled" },
      } as OpenAI.ChatCompletionCreateParamsNonStreaming);
      const choice = response.choices[0];
      const text = choice?.message?.content;
      if (!text) {
        throw new Error(
          `Model returned no content (finish_reason: ${choice?.finish_reason ?? "none"})`,
        );
      }
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error(
          `Model returned invalid JSON (finish_reason: ${choice.finish_reason})`,
        );
      }
      const result = schema.safeParse(raw);
      if (!result.success) {
        throw new Error(`Output did not match schema: ${z.prettifyError(result.error)}`);
      }
      return result.data;
    },
  };
}
