"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import type { ActivityOutcome, ScenarioDecisionActivity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RichText } from "./rich-text";

/**
 * Scenario with branching choices. Picking any option reveals its outcome and
 * rationale. A wrong pick allows one retry (remediation) — the activity then
 * completes as "needs_review"; a right first pick completes as "correct".
 */
export function ScenarioDecision({
  activity,
  onComplete,
}: {
  activity: ScenarioDecisionActivity;
  onComplete: (outcome: ActivityOutcome) => void;
}) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [missedOnce, setMissedOnce] = useState(false);

  const chosen = activity.choices.find((c) => c.id === chosenId) ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-l-4 border-brand bg-secondary/50 p-4">
        <RichText text={activity.scenario} className="text-sm" />
      </div>

      <p className="text-sm font-medium">What do you do?</p>
      <div className="space-y-2">
        {activity.choices.map((choice) => {
          const isChosen = choice.id === chosenId;
          return (
            <button
              key={choice.id}
              type="button"
              disabled={chosen !== null}
              onClick={() => setChosenId(choice.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                chosen === null && "hover:border-brand hover:bg-brand-muted/50",
                isChosen && choice.correct && "border-brand bg-brand-muted",
                isChosen && !choice.correct && "border-destructive bg-destructive/10",
                chosen !== null && !isChosen && "opacity-60",
              )}
            >
              {isChosen &&
                (choice.correct ? (
                  <CheckCircle2 className="size-4 shrink-0 text-brand-strong" aria-hidden />
                ) : (
                  <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
                ))}
              {choice.text}
            </button>
          );
        })}
      </div>

      {chosen && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-lg border p-4 text-sm"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What happens
            </p>
            <p className="mt-1">{chosen.outcome}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why
            </p>
            <p className="mt-1 text-muted-foreground">{chosen.rationale}</p>
          </div>
          {chosen.correct ? (
            <Button size="sm" onClick={() => onComplete(missedOnce ? "needs_review" : "correct")}>
              Continue
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMissedOnce(true);
                  setChosenId(null);
                }}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Try again
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onComplete("needs_review")}>
                Continue anyway
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
