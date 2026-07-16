"use client";

import { motion } from "framer-motion";
import type { Course, CourseProgress, SkillNode } from "@/lib/types";
import { cn } from "@/lib/utils";

export type NodeState = "locked" | "available" | "in_progress" | "complete";

const COL_W = 190;
const ROW_H = 120;
const PAD_X = 60;
const PAD_Y = 56;
const R = 30;

/** A node is complete when every one of its activities is done. */
export function getNodeState(
  node: SkillNode,
  course: Course,
  progress: CourseProgress | null,
): NodeState {
  const completedIds = new Set(
    Object.values(progress?.lessonProgress ?? {}).flatMap((lp) => lp.completedActivityIds),
  );
  const activitiesOf = (n: SkillNode) =>
    course.lessons.flatMap((l) => l.activities).filter((a) => a.skillNodeId === n.id);

  const isComplete = (n: SkillNode) => {
    const acts = activitiesOf(n);
    return acts.length > 0 && acts.every((a) => completedIds.has(a.id));
  };

  if (isComplete(node)) return "complete";

  const prereqsMet = node.prereqIds.every((pid) => {
    const prereq = course.skillNodes.find((n) => n.id === pid);
    return prereq ? isComplete(prereq) : true;
  });
  if (!prereqsMet) return "locked";

  const started = activitiesOf(node).some((a) => completedIds.has(a.id));
  return started ? "in_progress" : "available";
}

function nodeCenter(node: SkillNode): { x: number; y: number } {
  return { x: PAD_X + node.position.col * COL_W, y: PAD_Y + node.position.row * ROW_H };
}

/**
 * Branching tech-tree of skill nodes with prerequisite edges.
 * Scrolls horizontally on small screens.
 */
export function SkillTree({
  course,
  progress,
  selectedNodeId,
  onSelectNode,
  preview = false,
}: {
  course: Course;
  progress: CourseProgress | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  /** Preview mode (wizard): render every node as available, no lock states. */
  preview?: boolean;
}) {
  const nodes = course.skillNodes;
  const maxCol = Math.max(...nodes.map((n) => n.position.col));
  const maxRow = Math.max(...nodes.map((n) => n.position.row));
  const width = PAD_X * 2 + maxCol * COL_W;
  const height = PAD_Y * 2 + maxRow * ROW_H;

  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="overflow-x-auto rounded-xl border bg-card p-2">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block"
        role="group"
        aria-label={`Skill map for ${course.title}`}
      >
        {/* prerequisite edges */}
        {nodes.flatMap((node) =>
          node.prereqIds.map((pid) => {
            const from = byId.get(pid);
            if (!from) return null;
            const a = nodeCenter(from);
            const b = nodeCenter(node);
            const fromState = preview ? "available" : getNodeState(from, course, progress);
            const midX = (a.x + b.x) / 2;
            return (
              <path
                key={`${pid}-${node.id}`}
                d={`M ${a.x + R} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - R} ${b.y}`}
                fill="none"
                strokeWidth={3}
                className={cn(
                  fromState === "complete" ? "stroke-brand" : "stroke-border",
                )}
                strokeLinecap="round"
              />
            );
          }),
        )}

        {/* nodes */}
        {nodes.map((node, i) => {
          const { x, y } = nodeCenter(node);
          const state = preview ? "available" : getNodeState(node, course, progress);
          const mastery = progress?.masteryByNode[node.id] ?? 0;
          const selected = node.id === selectedNodeId;
          const circumference = 2 * Math.PI * (R + 6);

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectNode(node.id)}
              className="cursor-pointer"
              role="button"
              aria-label={`${node.title} — ${state.replace("_", " ")}, mastery ${mastery}%`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectNode(node.id);
              }}
            >
              {/* selection halo */}
              {selected && (
                <circle cx={x} cy={y} r={R + 11} className="fill-brand/15" />
              )}
              {/* mastery ring for started nodes */}
              {(state === "in_progress" || state === "complete") && (
                <circle
                  cx={x}
                  cy={y}
                  r={R + 6}
                  fill="none"
                  strokeWidth={4}
                  strokeLinecap="round"
                  className="stroke-brand"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - mastery / 100)}
                  transform={`rotate(-90 ${x} ${y})`}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={R}
                strokeWidth={2}
                className={cn(
                  state === "complete" && "fill-primary stroke-primary",
                  state === "in_progress" && "fill-brand stroke-brand",
                  state === "available" && "fill-card stroke-brand",
                  state === "locked" && "fill-muted stroke-border",
                )}
                strokeDasharray={state === "locked" ? "4 4" : undefined}
              />
              {state === "complete" ? (
                <path
                  d={`M ${x - 9} ${y} l 6 7 l 12 -13`}
                  fill="none"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-primary-foreground"
                />
              ) : state === "locked" ? (
                <g className="fill-muted-foreground" transform={`translate(${x - 7} ${y - 8})`}>
                  <rect x={1} y={6} width={12} height={9} rx={1.5} />
                  <path
                    d="M 3.5 6 v -2 a 3.5 3.5 0 0 1 7 0 v 2"
                    fill="none"
                    strokeWidth={2}
                    className="stroke-muted-foreground"
                  />
                </g>
              ) : (
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    "text-sm font-bold",
                    state === "in_progress" ? "fill-brand-foreground" : "fill-foreground",
                  )}
                >
                  {mastery > 0 ? `${mastery}` : node.title.charAt(0)}
                </text>
              )}
              <text
                x={x}
                y={y + R + 22}
                textAnchor="middle"
                className={cn(
                  "text-xs font-semibold",
                  state === "locked" ? "fill-muted-foreground" : "fill-foreground",
                )}
              >
                {node.title}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
