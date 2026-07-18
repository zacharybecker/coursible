"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, PartyPopper, Zap } from "lucide-react";
import type { Course, Lesson, Page, PageOutcome } from "@/lib/types";
import { completePage, gradeOpenEnded } from "@/lib/data/actions";
import { useAppStore } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TextPageView } from "./pages/text-page";
import { DiagramPageView } from "./pages/diagram-page";
import { MultipleChoicePageView } from "./pages/multiple-choice-page";
import { MatchingPageView } from "./pages/matching-page";
import { TypingPageView } from "./pages/typing-page";
import { OpenEndedPageView } from "./pages/open-ended-page";

const PAGE_LABELS: Record<string, string> = {
  text: "Learn",
  diagram: "Diagram",
  video: "Video",
  multiple_choice: "Quick check",
  matching: "Match",
  typing: "Recall",
  open_ended: "Explain it",
};

/**
 * Renders a lesson's page sequence and runs the core loop on each
 * completion: feedback (in-page) → mastery/XP/streak via the server action →
 * celebration toast → progression. Content pages advance on "Continue";
 * question pages answer → feedback → advance.
 */
export function PagePlayer({
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
  const [index, setIndex] = useState(Math.min(startIndex, lesson.pages.length - 1));
  const [finished, setFinished] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);

  const page = lesson.pages[index];
  const isLast = index === lesson.pages.length - 1;

  async function handleComplete(outcome: PageOutcome) {
    const result = await completePage(course.id, lesson.id, page.id, outcome);
    if (result) {
      // Content pages award no XP — only toast when there's something to celebrate.
      if (result.xpAwarded > 0 || result.lessonCompleted || result.streakExtended) {
        celebrate(result);
      }
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
            animate={{ width: `${(100 * index) / lesson.pages.length}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {index + 1}/{lesson.pages.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={page.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">
                  {PAGE_LABELS[page.type] ?? "Lesson"}
                </p>
                {"title" in page && <h1 className="mt-0.5 text-lg font-bold">{page.title}</h1>}
              </div>
              <PageBody
                page={page}
                onContinue={() => handleComplete("correct")}
                onComplete={handleComplete}
                onGrade={(answer) => gradeOpenEnded(course.id, lesson.id, page.id, answer)}
              />
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PageBody({
  page,
  onContinue,
  onComplete,
  onGrade,
}: {
  page: Page;
  onContinue: () => void;
  onComplete: (outcome: PageOutcome) => void;
  onGrade: (answer: string) => ReturnType<typeof gradeOpenEnded>;
}) {
  switch (page.type) {
    case "text":
      return <TextPageView page={page} onContinue={onContinue} />;
    case "diagram":
      return <DiagramPageView page={page} onContinue={onContinue} />;
    case "multiple_choice":
      return <MultipleChoicePageView page={page} onComplete={onComplete} />;
    case "matching":
      return <MatchingPageView page={page} onComplete={onComplete} />;
    case "typing":
      return <TypingPageView page={page} onComplete={onComplete} />;
    case "open_ended":
      return <OpenEndedPageView page={page} onGrade={onGrade} onComplete={onComplete} />;
    default:
      // video (deferred) and any future page types: skip-able placeholder.
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page type isn’t supported yet — skip ahead.
          </p>
          <Button onClick={onContinue}>Skip</Button>
        </div>
      );
  }
}
