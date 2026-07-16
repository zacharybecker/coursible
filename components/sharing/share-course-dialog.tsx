"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Link2, Megaphone, Users } from "lucide-react";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Course-sharing modal: copy-link sharing and cohort join links.
 * Links are mock — no multi-user backend exists in the prototype.
 */
export function ShareCourseDialog({
  course,
  children,
}: {
  course: Course;
  /** The trigger element (Base UI render prop — must be a single element). */
  children: React.ReactElement;
}) {
  const [copied, setCopied] = useState<"copy" | "cohort" | null>(null);

  const links = useMemo(
    () => ({
      copy: `https://ember.app/share/${course.contentId}?mode=copy`,
      cohort: `https://ember.app/share/${course.contentId}?mode=cohort&join=${course.id.slice(-6)}`,
    }),
    [course],
  );

  async function copyLink(kind: "copy" | "cohort") {
    try {
      await navigator.clipboard.writeText(links[kind]);
    } catch {
      // Clipboard can be unavailable (permissions); the visible link still lets
      // the user copy manually.
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share “{course.title}”</DialogTitle>
          <DialogDescription>
            Send a copy others can personalize, or learn the same course together.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="copy">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="copy" className="gap-1.5">
              <Copy className="size-3.5" aria-hidden />
              Copy course
            </TabsTrigger>
            <TabsTrigger value="cohort" className="gap-1.5">
              <Users className="size-3.5" aria-hidden />
              Join cohort
            </TabsTrigger>
          </TabsList>

          <TabsContent value="copy" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Recipients get an <strong>independent copy</strong> they can personalize. Their
              progress and edits never affect your course.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={links.copy} className="text-xs" aria-label="Copy-course share link" />
              <Button size="sm" onClick={() => copyLink("copy")} className="shrink-0">
                {copied === "copy" ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
                {copied === "copy" ? "Copied" : "Copy link"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="cohort" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Everyone follows the <strong>same course structure</strong> while keeping separate
              progress — like a study group on one syllabus.
            </p>
            {course.cohort ? (
              <p className="rounded-lg bg-secondary px-3 py-2 text-xs">
                <Users className="mr-1 inline size-3.5" aria-hidden />
                This course is part of <strong>{course.cohort.name}</strong> ·{" "}
                {course.cohort.memberCount} members
              </p>
            ) : null}
            <div className="flex gap-2">
              <Input readOnly value={links.cohort} className="text-xs" aria-label="Cohort join link" />
              <Button size="sm" onClick={() => copyLink("cohort")} className="shrink-0">
                {copied === "cohort" ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
                {copied === "cohort" ? "Copied" : "Copy link"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Megaphone className="size-3.5" aria-hidden />
            Publish updates to everyone using this course
          </span>
          <Button size="sm" variant="outline" disabled title="Coming soon — needs the real backend">
            Publish update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
