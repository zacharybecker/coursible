"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import type { GradeResponse, OpenEndedGrade, OpenEndedPage, PageOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Phase = "input" | "grading" | "graded" | "fallback";

/**
 * Open-ended question with AI grading at answer time. pass/partial complete
 * the page (full/no mastery credit); retry lets the learner revise without
 * penalty. If grading is unavailable, degrade to self-assessment against
 * the rubric so a provider outage never blocks progress.
 */
export function OpenEndedPageView({
  page,
  onGrade,
  onComplete,
}: {
  page: OpenEndedPage;
  onGrade: (answer: string) => Promise<GradeResponse>;
  onComplete: (outcome: PageOutcome) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [grade, setGrade] = useState<OpenEndedGrade | null>(null);

  async function submit() {
    if (!answer.trim()) return;
    setPhase("grading");
    const result = await onGrade(answer.trim());
    if (!result.ok) {
      setPhase("fallback");
      return;
    }
    setGrade(result.grade);
    setPhase("graded");
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{page.prompt}</p>

      {(phase === "input" || phase === "grading") && (
        <>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Answer in your own words…"
            aria-label="Your answer"
            disabled={phase === "grading"}
          />
          <Button onClick={submit} disabled={phase === "grading" || !answer.trim()}>
            {phase === "grading" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Grading…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden />
                Submit for grading
              </>
            )}
          </Button>
        </>
      )}

      {phase === "graded" && grade && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "space-y-3 rounded-lg border p-3 text-sm",
            grade.verdict === "pass"
              ? "border-brand bg-brand-muted"
              : "border-border bg-secondary/50",
          )}
        >
          <p className="font-semibold">
            {grade.verdict === "pass" && "Nice — that covers it."}
            {grade.verdict === "partial" && "Good attempt — some gaps."}
            {grade.verdict === "retry" && "Let's try that again."}
          </p>
          <p className="text-muted-foreground">{grade.feedback}</p>

          {grade.verdict !== "retry" && (
            <>
              {grade.missedKeyPoints.length > 0 && (
                <div>
                  <p className="font-medium">You missed:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {grade.missedKeyPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="font-medium">Sample answer</p>
                <p className="mt-1 text-muted-foreground">{page.rubric.sampleAnswer}</p>
              </div>
              <Button
                size="sm"
                onClick={() => onComplete(grade.verdict === "pass" ? "correct" : "incorrect")}
              >
                Continue
              </Button>
            </>
          )}
          {grade.verdict === "retry" && (
            <Button size="sm" onClick={() => setPhase("input")}>
              Revise my answer
            </Button>
          )}
        </motion.div>
      )}

      {phase === "fallback" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <p className="font-semibold">Grading is unavailable right now — check your own answer.</p>
          <div>
            <p className="font-medium">A good answer covers:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
              {page.rubric.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Sample answer</p>
            <p className="mt-1 text-muted-foreground">{page.rubric.sampleAnswer}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onComplete("correct")}>
              I covered these
            </Button>
            <Button size="sm" variant="outline" onClick={() => onComplete("incorrect")}>
              I missed some
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
