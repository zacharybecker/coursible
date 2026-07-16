"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import type { ActivityOutcome, ExplanationCheckActivity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RichText } from "./rich-text";

/**
 * Explanation + knowledge check. Outcome is "correct" only when every
 * question is answered right on the first try; otherwise "needs_review"
 * and a remediation summary of missed concepts is shown before continuing.
 */
export function ExplanationCheck({
  activity,
  onComplete,
}: {
  activity: ExplanationCheckActivity;
  onComplete: (outcome: ActivityOutcome) => void;
}) {
  const [phase, setPhase] = useState<"read" | "quiz" | "remediate">("read");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [missedIds, setMissedIds] = useState<string[]>([]);

  const question = activity.questions[questionIndex];
  const isLast = questionIndex === activity.questions.length - 1;
  const missedFirstTry = missedIds.includes(question?.id ?? "");

  function submitAnswer(optionId: string) {
    if (answered) return;
    setSelected(optionId);
    setAnswered(true);
    if (optionId !== question.correctOptionId && !missedFirstTry) {
      setMissedIds((ids) => [...ids, question.id]);
    }
  }

  function next() {
    const misses = missedIds.length;
    if (!isLast) {
      setQuestionIndex((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    } else if (misses > 0) {
      setPhase("remediate");
    } else {
      onComplete("correct");
    }
  }

  if (phase === "read") {
    return (
      <div className="space-y-5">
        <RichText text={activity.content} className="text-[15px]" />
        <Button onClick={() => setPhase("quiz")} className="w-full sm:w-auto">
          Check my understanding
        </Button>
      </div>
    );
  }

  if (phase === "remediate") {
    const missed = activity.questions.filter((q) => missedIds.includes(q.id));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpen className="size-5 text-brand" aria-hidden />
          Quick review before moving on
        </div>
        <p className="text-sm text-muted-foreground">
          You missed {missed.length} question{missed.length === 1 ? "" : "s"} — here’s the idea
          again:
        </p>
        {missed.map((q) => (
          <div key={q.id} className="rounded-lg border bg-secondary/50 p-3 text-sm">
            <p className="font-medium">{q.prompt}</p>
            <p className="mt-1 text-muted-foreground">{q.explanation}</p>
          </div>
        ))}
        <Button onClick={() => onComplete("needs_review")} className="w-full sm:w-auto">
          Got it — continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Question {questionIndex + 1} of {activity.questions.length}
      </p>
      <p className="font-medium">{question.prompt}</p>
      <div className="space-y-2" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((option) => {
          const isCorrect = option.id === question.correctOptionId;
          const isSelected = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={answered}
              onClick={() => submitAnswer(option.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                !answered && "hover:border-brand hover:bg-brand-muted/50",
                answered && isCorrect && "border-brand bg-brand-muted",
                answered && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                answered && !isSelected && !isCorrect && "opacity-60",
              )}
            >
              {answered && isCorrect && (
                <CheckCircle2 className="size-4 shrink-0 text-brand-strong" aria-hidden />
              )}
              {answered && isSelected && !isCorrect && (
                <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
              )}
              {option.text}
            </button>
          );
        })}
      </div>

      {answered && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-lg border p-3 text-sm",
            selected === question.correctOptionId
              ? "border-brand bg-brand-muted"
              : "border-border bg-secondary/50",
          )}
        >
          <p className="font-semibold">
            {selected === question.correctOptionId ? "Correct!" : "Not quite."}
          </p>
          <p className="mt-1 text-muted-foreground">{question.explanation}</p>
          <Button size="sm" className="mt-3" onClick={next}>
            {isLast ? "Finish check" : "Next question"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
