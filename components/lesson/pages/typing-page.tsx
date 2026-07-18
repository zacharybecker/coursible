"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { PageOutcome, TypingPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function normalizeTypedAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Free-recall typing. "correct" only on a clean first submission; a retry
 * that eventually matches — or revealing the answer — completes "incorrect".
 */
export function TypingPageView({
  page,
  onComplete,
}: {
  page: TypingPage;
  onComplete: (outcome: PageOutcome) => void;
}) {
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<"input" | "correct" | "wrong" | "revealed">("input");

  const accepted = page.acceptableAnswers.map(normalizeTypedAnswer);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    if (accepted.includes(normalizeTypedAnswer(value))) {
      setStatus("correct");
    } else {
      setAttempts((a) => a + 1);
      setStatus("wrong");
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{page.prompt}</p>
      {(status === "input" || status === "wrong") && (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (status === "wrong") setStatus("input");
            }}
            placeholder="Type your answer"
            aria-label="Your answer"
            autoFocus
          />
          <Button type="submit" disabled={!value.trim()}>
            Check
          </Button>
        </form>
      )}

      {status === "wrong" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <p className="font-semibold">Not quite.</p>
          {page.hint && <p className="mt-1 text-muted-foreground">{page.hint}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => setStatus("input")}>
              Try again
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("revealed")}>
              Show answer
            </Button>
          </div>
        </motion.div>
      )}

      {status === "correct" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-brand bg-brand-muted p-3 text-sm"
        >
          <p className="font-semibold">Correct!</p>
          <p className="mt-1 text-muted-foreground">{page.explanation}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => onComplete(attempts === 0 ? "correct" : "incorrect")}
          >
            Continue
          </Button>
        </motion.div>
      )}

      {status === "revealed" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <p className="font-semibold">
            The answer: <span className="text-brand-strong">{page.acceptableAnswers[0]}</span>
          </p>
          <p className="mt-1 text-muted-foreground">{page.explanation}</p>
          <Button size="sm" className="mt-3" onClick={() => onComplete("incorrect")}>
            Continue
          </Button>
        </motion.div>
      )}
    </div>
  );
}
