"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, Terminal } from "lucide-react";
import type { ActivityOutcome, AppliedTaskActivity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichText } from "./rich-text";

/** Mock rule-matching: every expected pattern must match (case-insensitive). */
export function evaluateCommandSubmission(
  submission: string,
  expectedPatterns: string[] | undefined,
): boolean {
  if (!expectedPatterns || expectedPatterns.length === 0) return true;
  return expectedPatterns.every((source) => new RegExp(source, "i").test(submission));
}

/**
 * Applied task with a lightweight submission — a typed command graded by
 * pattern-matching, or an honor-system checklist. Non-matching commands are
 * "needs review", not failure.
 */
export function AppliedTask({
  activity,
  onComplete,
}: {
  activity: AppliedTaskActivity;
  onComplete: (outcome: ActivityOutcome) => void;
}) {
  const [submission, setSubmission] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<"pass" | "review" | null>(null);

  const checklist = activity.checklist ?? [];
  const allChecked = checklist.length > 0 && checklist.every((item) => checked.has(item.id));

  function submitCommand() {
    if (!submission.trim()) return;
    setResult(evaluateCommandSubmission(submission, activity.expectedPatterns) ? "pass" : "review");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        {activity.submissionType === "command" ? (
          <Terminal className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        ) : (
          <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        )}
        <RichText text={activity.prompt} className="text-sm" />
      </div>

      {activity.submissionType === "command" ? (
        <div className="space-y-3">
          <Textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            placeholder="Type your answer…"
            className="font-mono text-sm"
            rows={2}
            disabled={result === "pass"}
            aria-label="Your answer"
          />
          {result === null && (
            <Button size="sm" onClick={submitCommand} disabled={!submission.trim()}>
              Submit
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {checklist.map((item) => (
            <Label
              key={item.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm font-normal transition-colors",
                checked.has(item.id) && "border-brand bg-brand-muted/60",
              )}
            >
              <Checkbox
                checked={checked.has(item.id)}
                onCheckedChange={(value) => {
                  setChecked((prev) => {
                    const nextSet = new Set(prev);
                    if (value) nextSet.add(item.id);
                    else nextSet.delete(item.id);
                    return nextSet;
                  });
                  setResult(null);
                }}
                className="mt-0.5"
              />
              {item.text}
            </Label>
          ))}
          {result === null && (
            <Button size="sm" onClick={() => setResult(allChecked ? "pass" : "review")}>
              {allChecked ? "All done — submit" : "Submit progress"}
            </Button>
          )}
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "space-y-3 rounded-lg border p-4 text-sm",
            result === "pass" ? "border-brand bg-brand-muted" : "bg-secondary/50",
          )}
        >
          <p className="flex items-center gap-2 font-semibold">
            {result === "pass" && <CheckCircle2 className="size-4 text-brand-strong" aria-hidden />}
            {result === "pass" ? "Nailed it" : "Needs another look"}
          </p>
          <p className="text-muted-foreground">
            {result === "pass" ? activity.successFeedback : activity.reviewFeedback}
          </p>
          <div className="flex gap-2">
            {result === "review" && (
              <Button size="sm" variant="outline" onClick={() => setResult(null)}>
                Revise
              </Button>
            )}
            <Button
              size="sm"
              variant={result === "pass" ? "default" : "ghost"}
              onClick={() => onComplete(result === "pass" ? "correct" : "needs_review")}
            >
              Continue
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
