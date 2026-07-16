"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, PartyPopper, Zap } from "lucide-react";
import type { ActivityOutcome, Course, Lesson } from "@/lib/types";
import { completeActivity } from "@/lib/data/repository";
import { useAppStore } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExplanationCheck } from "./explanation-check";
import { ScenarioDecision } from "./scenario-decision";
import { AppliedTask } from "./applied-task";
import { AiTutorPreview, SpacedReviewPreview } from "./activity-previews";

const ACTIVITY_LABELS: Record<string, string> = {
  explanation_check: "Learn & check",
  scenario_decision: "Scenario",
  applied_task: "Applied task",
  ai_tutor_conversation: "AI tutor",
  spaced_review: "Review",
};

/**
 * Renders a lesson's activity sequence and runs the core loop on each
 * completion: feedback (in-activity) → mastery/XP/streak via the repository →
 * celebration toast → progression.
 */
export function ActivityPlayer({
  course,
  lesson,
  startIndex,
}: {
  course: Course;
  lesson: Lesson;
  startIndex: number;
}) {
  const celebrate = useAppStore((s) => s.celebrate);
  const bump = useAppStore((s) => s.bumpDataVersion);
  const [index, setIndex] = useState(Math.min(startIndex, lesson.activities.length - 1));
  const [finished, setFinished] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);

  const activity = lesson.activities[index];
  const isLast = index === lesson.activities.length - 1;

  async function handleComplete(outcome: ActivityOutcome) {
    const result = await completeActivity(course.id, lesson.id, activity.id, outcome);
    if (result) {
      celebrate(result);
      setSessionXp((xp) => xp + result.xpAwarded);
      bump();
    }
    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (finished) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <PartyPopper className="size-12 text-brand" aria-hidden />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold">Lesson complete!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              “{lesson.title}” is in the books.
            </p>
          </div>
          {sessionXp > 0 && (
            <p className="flex items-center gap-1.5 rounded-full bg-brand-muted px-4 py-1.5 font-bold text-brand-strong">
              <Zap className="size-4" aria-hidden />+{sessionXp} XP earned
            </p>
          )}
          <Button nativeButton={false} render={<Link href={`/courses/${course.id}`} />}>
            Back to skill map
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* progress header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/courses/${course.id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to course"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-brand"
            animate={{ width: `${(100 * index) / lesson.activities.length}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {index + 1}/{lesson.activities.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">
                  {ACTIVITY_LABELS[activity.type]}
                </p>
                <h1 className="mt-0.5 text-lg font-bold">{activity.title}</h1>
              </div>
              <ActivityBody activity={activity} onComplete={handleComplete} />
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ActivityBody({
  activity,
  onComplete,
}: {
  activity: Lesson["activities"][number];
  onComplete: (outcome: ActivityOutcome) => void;
}) {
  switch (activity.type) {
    case "explanation_check":
      return <ExplanationCheck activity={activity} onComplete={onComplete} />;
    case "scenario_decision":
      return <ScenarioDecision activity={activity} onComplete={onComplete} />;
    case "applied_task":
      return <AppliedTask activity={activity} onComplete={onComplete} />;
    case "ai_tutor_conversation":
      return <AiTutorPreview activity={activity} onComplete={onComplete} />;
    case "spaced_review":
      return <SpacedReviewPreview activity={activity} onComplete={onComplete} />;
  }
}
