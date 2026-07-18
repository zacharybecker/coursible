// Wizard answers cross the client → route-handler boundary as JSON; this is
// the server-side gate.

import { z } from "zod";
import type { WizardAnswers } from "@/lib/types";

export const wizardAnswersSchema: z.ZodType<WizardAnswers> = z.object({
  outcome: z.string().min(10).max(2000),
  knowledge: z.string().min(1).max(100),
  time: z.string().min(1).max(100),
  style: z.string().min(1).max(100),
  sources: z.array(z.string().max(300)).max(20),
});
