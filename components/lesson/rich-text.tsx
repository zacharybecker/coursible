import { Fragment } from "react";

/**
 * Minimal renderer for lesson content's markdown subset: paragraphs
 * (blank-line separated), **bold**, `inline code`, #/##/### headings, and
 * "- " bullet lists. Course JSON is controlled, so this stays tiny on
 * purpose — no markdown dependency.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <Block key={i} block={block.trim()} />
      ))}
    </div>
  );
}

function Block({ block }: { block: string }) {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  if (lines.every((l) => l.startsWith("- "))) {
    return (
      <ul className="mb-3 list-disc space-y-1 pl-5 leading-relaxed last:mb-0">
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.slice(2))}</li>
        ))}
      </ul>
    );
  }

  const heading = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
  if (heading && lines.length === 1) {
    const level = heading[1].length;
    if (level === 1) {
      return <h2 className="mb-2 mt-4 text-lg font-bold first:mt-0">{renderInline(heading[2])}</h2>;
    }
    if (level === 2) {
      return <h3 className="mb-2 mt-4 font-bold first:mt-0">{renderInline(heading[2])}</h3>;
    }
    return <h4 className="mb-2 mt-3 text-sm font-bold first:mt-0">{renderInline(heading[2])}</h4>;
  }

  return <p className="mb-3 leading-relaxed last:mb-0">{renderInline(lines.join(" "))}</p>;
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
