"use client";

import { CalendarClock, MessageCircleQuestion, Sparkles } from "lucide-react";
import type {
  ActivityOutcome,
  AiTutorConversationActivity,
  SpacedReviewActivity,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Static preview for the AI tutor conversation (functional version comes with the real backend). */
export function AiTutorPreview({
  activity,
  onComplete,
}: {
  activity: AiTutorConversationActivity;
  onComplete: (outcome: ActivityOutcome) => void;
}) {
  return (
    <div className="space-y-4">
      <PreviewBanner icon={MessageCircleQuestion} label="AI tutor · preview" />
      <p className="text-sm text-muted-foreground">{activity.description}</p>
      <div className="space-y-2 rounded-lg border bg-secondary/30 p-3">
        {activity.sampleMessages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", msg.role === "learner" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                msg.role === "learner"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm border bg-card",
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={() => onComplete("correct")} className="w-full sm:w-auto">
        Continue
      </Button>
    </div>
  );
}

/** Static preview for the adaptive spaced-review session. */
export function SpacedReviewPreview({
  activity,
  onComplete,
}: {
  activity: SpacedReviewActivity;
  onComplete: (outcome: ActivityOutcome) => void;
}) {
  return (
    <div className="space-y-4">
      <PreviewBanner icon={CalendarClock} label="Spaced review · preview" />
      <p className="text-sm text-muted-foreground">{activity.description}</p>
      <ul className="space-y-1.5">
        {activity.reviewItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <Button onClick={() => onComplete("correct")} className="w-full sm:w-auto">
        Continue
      </Button>
    </div>
  );
}

function PreviewBanner({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-brand/50 bg-brand-muted/40 px-3 py-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-brand-strong">
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
      <span className="text-xs text-muted-foreground">Interactive version coming soon</span>
    </div>
  );
}
