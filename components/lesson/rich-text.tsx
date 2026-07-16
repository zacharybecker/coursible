import { Fragment } from "react";

/**
 * Minimal renderer for lesson content: paragraphs (blank-line separated),
 * **bold**, and `inline code`. Course JSON is controlled, so this stays tiny
 * on purpose — no markdown dependency.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <div className={className}>
      {paragraphs.map((para, i) => (
        <p key={i} className="mb-3 leading-relaxed last:mb-0">
          {renderInline(para)}
        </p>
      ))}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** and `code` spans, keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
