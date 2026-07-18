"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import type { MultipleChoicePage, PageOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MultipleChoicePageView({
  page,
  onComplete,
}: {
  page: MultipleChoicePage;
  onComplete: (outcome: PageOutcome) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const correct = selected === page.correctOptionId;
  const selectedOption = page.options.find((o) => o.id === selected);

  return (
    <div className="space-y-4">
      {page.context && (
        <p className="rounded-lg border bg-secondary/50 p-3 text-sm">{page.context}</p>
      )}
      <p className="font-medium">{page.prompt}</p>
      <div className="space-y-2" role="radiogroup" aria-label={page.prompt}>
        {page.options.map((option) => {
          const isCorrect = option.id === page.correctOptionId;
          const isSelected = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={answered}
              onClick={() => setSelected(option.id)}
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
            correct ? "border-brand bg-brand-muted" : "border-border bg-secondary/50",
          )}
        >
          <p className="font-semibold">{correct ? "Correct!" : "Not quite."}</p>
          {!correct && selectedOption?.misconception && (
            <p className="mt-1 text-muted-foreground">
              Common mix-up: {selectedOption.misconception}
            </p>
          )}
          <p className="mt-1 text-muted-foreground">{page.explanation}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => onComplete(correct ? "correct" : "incorrect")}
          >
            Continue
          </Button>
        </motion.div>
      )}
    </div>
  );
}
