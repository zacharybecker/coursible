"use client";

import { useEffect, useState } from "react";
import type { DiagramPage } from "@/lib/types";
import { Button } from "@/components/ui/button";

/**
 * Client-side Mermaid render. Invalid Mermaid must never block a lesson:
 * on any render failure we fall back to a card carrying the caption text.
 */
export function DiagramPageView({
  page,
  onContinue,
}: {
  page: DiagramPage;
  onContinue: () => void;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const { svg: rendered } = await mermaid.render(
          `mmd-${page.id.replace(/[^a-zA-Z0-9-]/g, "")}`,
          page.mermaid,
        );
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page.id, page.mermaid]);

  return (
    <div className="space-y-4">
      {page.intro && <p className="text-[15px] leading-relaxed">{page.intro}</p>}
      {failed ? (
        <div className="rounded-lg border bg-secondary/50 p-4 text-sm text-muted-foreground">
          The diagram could not be displayed.
        </div>
      ) : svg ? (
        <div
          className="overflow-x-auto rounded-lg border bg-card p-3 [&_svg]:mx-auto [&_svg]:max-w-full"
          // Mermaid runs with securityLevel "strict"; source is controlled course JSON.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="h-32 animate-pulse rounded-lg border bg-secondary/40" aria-hidden />
      )}
      <p className="text-sm text-muted-foreground">{page.caption}</p>
      <Button onClick={onContinue} className="w-full sm:w-auto">
        Continue
      </Button>
    </div>
  );
}
