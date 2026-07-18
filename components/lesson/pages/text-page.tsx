"use client";

import type { TextPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RichText } from "../rich-text";

export function TextPageView({
  page,
  onContinue,
}: {
  page: TextPage;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <RichText text={page.body} className="text-[15px]" />
      <Button onClick={onContinue} className="w-full sm:w-auto">
        Continue
      </Button>
    </div>
  );
}
