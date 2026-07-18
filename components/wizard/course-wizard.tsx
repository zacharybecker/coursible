"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FileText, Sparkles, TriangleAlert, Upload, X } from "lucide-react";
import type { CourseContent, GenerationJobStatus, WizardAnswers } from "@/lib/types";
import { getGenerationJob } from "@/lib/data/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CoursePreview } from "./course-preview";

const KNOWLEDGE_OPTIONS = [
  { value: "beginner", label: "Complete beginner", hint: "Starting from zero" },
  { value: "some", label: "Some exposure", hint: "I've dabbled or read about it" },
  { value: "comfortable", label: "Comfortable with basics", hint: "I want to go deeper" },
];

const TIME_OPTIONS = [
  { value: "10", label: "~10 min / day", hint: "Short daily sessions" },
  { value: "25", label: "~25 min / day", hint: "A solid daily block" },
  { value: "60", label: "1 hour+ / day", hint: "I'm going all in" },
  { value: "weekend", label: "Weekends only", hint: "Longer, less frequent sessions" },
];

const STYLE_OPTIONS = [
  { value: "hands_on", label: "Hands-on projects", hint: "Learn by building" },
  { value: "reading", label: "Read, then quiz me", hint: "Explanations with knowledge checks" },
  { value: "scenarios", label: "Real-world scenarios", hint: "Decisions and case studies" },
  { value: "mix", label: "Mix it up", hint: "A balance of everything" },
];

const MAX_FILE_MB = 10;
const ACCEPTED_TYPES = ".pdf,.md,.txt,.docx";

const STATUS_MESSAGES: Record<GenerationJobStatus, string> = {
  queued: "Queued…",
  outlining: "Mapping the skills you'll need…",
  generating: "Writing lessons, questions, and diagrams…",
  validating: "Checking every question against what's been taught…",
  failed: "Something went wrong.",
  done: "Done!",
};

const POLL_INTERVAL_MS = 2000;

type Step = "outcome" | "knowledge" | "time" | "style" | "sources" | "generating" | "preview";
const FORM_STEPS: Step[] = ["outcome", "knowledge", "time", "style", "sources"];

export function CourseWizard() {
  const [step, setStep] = useState<Step>("outcome");
  const [answers, setAnswers] = useState<WizardAnswers>({
    outcome: "",
    knowledge: "",
    time: "",
    style: "",
    sources: [],
  });
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CourseContent | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<GenerationJobStatus>("queued");
  const [jobError, setJobError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = FORM_STEPS.indexOf(step);

  async function startGeneration() {
    setJobError(null);
    setJobId(null);
    setJobStatus("queued");
    setStep("generating");
    try {
      const res = await fetch("/api/generation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { jobId: string };
      setJobId(data.jobId);
    } catch {
      setJobError("Could not start generation. Check your connection and try again.");
    }
  }

  // Poll the job row for real stage progress until done or failed.
  useEffect(() => {
    if (step !== "generating" || !jobId || jobError) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const job = await getGenerationJob(jobId).catch(() => null);
      if (cancelled || !job) return;
      if (job.status === "failed") {
        setJobError(job.error ?? "Something went wrong during generation.");
      } else if (job.status === "done" && job.content) {
        setPreview(job.content);
        setStep("preview");
      } else {
        setJobStatus(job.status);
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, jobId, jobError]);

  function canAdvance(): boolean {
    switch (step) {
      case "outcome":
        return answers.outcome.trim().length >= 10;
      case "knowledge":
        return !!answers.knowledge;
      case "time":
        return !!answers.time;
      case "style":
        return !!answers.style;
      case "sources":
        return true; // optional
      default:
        return false;
    }
  }

  function next() {
    if (step === "sources") {
      void startGeneration();
    } else {
      setStep(FORM_STEPS[stepIndex + 1]);
    }
  }

  function back() {
    if (stepIndex > 0) setStep(FORM_STEPS[stepIndex - 1]);
  }

  function addFiles(list: FileList | null) {
    setFileError(null);
    if (!list) return;
    const names: string[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setFileError(`“${file.name}” is over ${MAX_FILE_MB} MB — try a smaller file.`);
        continue;
      }
      names.push(file.name);
    }
    setAnswers((a) => ({ ...a, sources: [...a.sources, ...names] }));
  }

  if (step === "preview" && preview) {
    return (
      <CoursePreview
        content={preview}
        answers={answers}
        onRestart={() => {
          setPreview(null);
          setJobId(null);
          setJobError(null);
          setAnswers({ outcome: "", knowledge: "", time: "", style: "", sources: [] });
          setStep("outcome");
        }}
      />
    );
  }

  if (step === "generating") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          {jobError ? (
            <>
              <TriangleAlert className="size-10 text-destructive" aria-hidden />
              <div>
                <h2 className="font-bold">Generation failed</h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">{jobError}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void startGeneration()}>
                  <Sparkles className="size-4" aria-hidden />
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setJobError(null);
                    setJobId(null);
                    setStep("sources");
                  }}
                >
                  Back
                </Button>
              </div>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              >
                <Sparkles className="size-10 text-brand" aria-hidden />
              </motion.div>
              <div>
                <h2 className="font-bold">Designing your course</h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={jobStatus}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    {STATUS_MESSAGES[jobStatus]}
                  </motion.p>
                </AnimatePresence>
                <p className="mt-2 text-xs text-muted-foreground">
                  This takes a few minutes — a real AI is writing every lesson.
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-brand"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* step progress */}
      <div className="flex items-center gap-1.5">
        {FORM_STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= stepIndex ? "bg-brand" : "bg-muted",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardContent className="space-y-4 p-5">
              {step === "outcome" && (
                <>
                  <StepHeading
                    title="What do you want to be able to do?"
                    hint="Describe the real-world outcome — not the topic. “Run my own sourdough bakery stall” beats “baking”."
                  />
                  <Textarea
                    value={answers.outcome}
                    onChange={(e) => setAnswers((a) => ({ ...a, outcome: e.target.value }))}
                    placeholder="e.g. Confidently shoot a friend's wedding in manual mode"
                    rows={3}
                    aria-label="Your learning goal"
                  />
                  {answers.outcome.trim().length > 0 && answers.outcome.trim().length < 10 && (
                    <p className="text-xs text-destructive">
                      A few more words — the more specific the goal, the better the course.
                    </p>
                  )}
                </>
              )}

              {step === "knowledge" && (
                <>
                  <StepHeading
                    title="Where are you starting from?"
                    hint="This sets the difficulty of your first lessons."
                  />
                  <OptionList
                    options={KNOWLEDGE_OPTIONS}
                    value={answers.knowledge}
                    onChange={(v) => setAnswers((a) => ({ ...a, knowledge: v }))}
                  />
                </>
              )}

              {step === "time" && (
                <>
                  <StepHeading
                    title="How much time can you give it?"
                    hint="Lessons get sized to fit your real schedule."
                  />
                  <OptionList
                    options={TIME_OPTIONS}
                    value={answers.time}
                    onChange={(v) => setAnswers((a) => ({ ...a, time: v }))}
                  />
                </>
              )}

              {step === "style" && (
                <>
                  <StepHeading
                    title="How do you like to learn?"
                    hint="This shapes the mix of pages in your course."
                  />
                  <OptionList
                    options={STYLE_OPTIONS}
                    value={answers.style}
                    onChange={(v) => setAnswers((a) => ({ ...a, style: v }))}
                  />
                </>
              )}

              {step === "sources" && (
                <>
                  <StepHeading
                    title="Any materials to build from?"
                    hint="Optional — notes, syllabi, or docs you trust. (File contents aren't used yet.)"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES}
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                    aria-label="Upload source documents"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
                  >
                    <Upload className="size-6" aria-hidden />
                    Click to add files ({ACCEPTED_TYPES.replaceAll(",", ", ")} · max {MAX_FILE_MB} MB)
                  </button>
                  {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                  {answers.sources.length > 0 && (
                    <ul className="space-y-1.5">
                      {answers.sources.map((name, i) => (
                        <li
                          key={`${name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FileText className="size-4 shrink-0 text-brand" aria-hidden />
                            <span className="truncate">{name}</span>
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${name}`}
                            onClick={() =>
                              setAnswers((a) => ({
                                ...a,
                                sources: a.sources.filter((_, j) => j !== i),
                              }))
                            }
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <div className="flex justify-between border-t pt-4">
                <Button variant="ghost" size="sm" onClick={back} disabled={stepIndex === 0}>
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Button>
                <Button size="sm" onClick={next} disabled={!canAdvance()}>
                  {step === "sources" ? (
                    <>
                      <Sparkles className="size-4" aria-hidden />
                      Generate my course
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="font-bold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function OptionList({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; hint: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition-colors",
            value === option.value
              ? "border-brand bg-brand-muted"
              : "hover:border-brand/50 hover:bg-brand-muted/40",
          )}
        >
          <span className="block text-sm font-medium">{option.label}</span>
          <span className="block text-xs text-muted-foreground">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}
