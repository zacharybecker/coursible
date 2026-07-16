import type { CourseContent } from "@/lib/types";

/** Catalog-only starter course. */
export const sqlAnalytics: CourseContent = {
  contentId: "content-sql-analytics",
  title: "SQL for Product Analytics",
  description: "Answer real product questions with SQL: funnels, retention, and cohort analysis on event data.",
  outcome: "Answer product questions independently by querying the analytics warehouse",
  tags: ["SQL", "Data", "Analytics"],
  estimatedHours: 6,
  skillNodes: [
    {
      id: "sql-select",
      title: "Queries & Filters",
      description: "SELECT, WHERE, ORDER BY on event tables.",
      prereqIds: [],
      lessonIds: ["sql-l1"],
      position: { col: 0, row: 0 },
    },
    {
      id: "sql-agg",
      title: "Aggregation",
      description: "GROUP BY, counts, and rates.",
      prereqIds: ["sql-select"],
      lessonIds: ["sql-l2"],
      position: { col: 1, row: 0 },
    },
    {
      id: "sql-joins",
      title: "Joins",
      description: "Combine users, events, and subscriptions.",
      prereqIds: ["sql-select"],
      lessonIds: ["sql-l3"],
      position: { col: 1, row: 1 },
    },
    {
      id: "sql-funnels",
      title: "Funnels & Retention",
      description: "The analyses PMs actually ask for.",
      prereqIds: ["sql-agg", "sql-joins"],
      lessonIds: ["sql-l4"],
      position: { col: 2, row: 0 },
    },
  ],
  lessons: [
    {
      id: "sql-l1",
      title: "Your first event query",
      description: "Pull raw events and filter them.",
      skillNodeId: "sql-select",
      estimatedMinutes: 12,
      activities: [
        {
          type: "explanation_check",
          id: "sql-l1-a1",
          title: "Anatomy of a query",
          skillNodeId: "sql-select",
          xp: 10,
          content:
            "Every analytics query starts the same way: `SELECT` the columns you want, `FROM` the table that has them, `WHERE` the rows you care about. Event tables are huge, so a time filter — `WHERE occurred_at >= '2026-07-01'` — is almost always your first line of defense.",
          questions: [
            {
              id: "q1",
              prompt: "Why do analysts habitually add a date filter to event-table queries?",
              options: [
                { id: "a", text: "Event tables are enormous; unfiltered scans are slow and costly" },
                { id: "b", text: "SQL requires a WHERE clause" },
                { id: "c", text: "Old events are automatically deleted anyway" },
              ],
              correctOptionId: "a",
              explanation: "Event tables grow forever. Scoping to a date range keeps queries fast and warehouse bills sane.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "sql-l1-a2",
          title: "Write the query",
          skillNodeId: "sql-select",
          xp: 15,
          prompt:
            "Write a query that selects the `user_id` and `occurred_at` columns from the `events` table for events named 'signup'.",
          submissionType: "command",
          expectedPatterns: ["select", "user_id", "occurred_at", "from\\s+events", "where", "signup"],
          successFeedback: "Exactly — SELECT the two columns FROM events WHERE the event name is 'signup'.",
          reviewFeedback:
            "Expected something like `SELECT user_id, occurred_at FROM events WHERE name = 'signup'` — check you have both columns, the table, and the filter.",
        },
      ],
    },
    {
      id: "sql-l2",
      title: "Counting things correctly",
      description: "GROUP BY and the COUNT(DISTINCT) trap.",
      skillNodeId: "sql-agg",
      estimatedMinutes: 12,
      activities: [
        {
          type: "scenario_decision",
          id: "sql-l2-a1",
          title: "How many users signed up?",
          skillNodeId: "sql-agg",
          xp: 15,
          scenario:
            "A PM asks how many users signed up last week. Your `COUNT(*)` on signup events returns 1,340, but the dashboard says 1,180 users. Which count is right for the PM's question?",
          choices: [
            {
              id: "a",
              text: "COUNT(DISTINCT user_id) — some users fired the signup event more than once",
              outcome: "The distinct count is 1,180 — matching the dashboard. Retried signups created duplicate events.",
              rationale: "The PM asked about *users*, not events. Duplicate events per user are routine; COUNT(DISTINCT) answers the actual question.",
              correct: true,
            },
            {
              id: "b",
              text: "COUNT(*) — every event is a signup, so 1,340 is correct",
              outcome: "You report 1,340; finance reconciles against billing and finds 160 phantom users. Awkward.",
              rationale: "Counting events counts retries and double-fires. User questions need user-level counts.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "sql-l3",
      title: "Joining users to events",
      description: "Enrich events with user attributes.",
      skillNodeId: "sql-joins",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "sql-l3-a1",
          title: "INNER vs LEFT",
          skillNodeId: "sql-joins",
          xp: 10,
          content:
            "An `INNER JOIN` keeps only rows that match on both sides; a `LEFT JOIN` keeps every row from the left table and fills the right side with NULLs where nothing matches.\n\nThe analytics rule of thumb: when the question is \"all X, with Y if available\", start from X and LEFT JOIN Y. \"All users with their purchases\" must not silently drop users who never purchased.",
          questions: [
            {
              id: "q1",
              prompt: "You want signup-to-purchase conversion: all signed-up users, and their first purchase if any. Which join?",
              options: [
                { id: "a", text: "LEFT JOIN from users to purchases — keep users with no purchase" },
                { id: "b", text: "INNER JOIN — only converted users matter" },
                { id: "c", text: "Either; they give the same result" },
              ],
              correctOptionId: "a",
              explanation:
                "Conversion needs a denominator. INNER JOIN drops non-purchasers and your conversion rate becomes 100% by construction.",
            },
          ],
        },
      ],
    },
    {
      id: "sql-l4",
      title: "Build a signup funnel",
      description: "Multi-step funnel analysis.",
      skillNodeId: "sql-funnels",
      estimatedMinutes: 20,
      activities: [
        {
          type: "applied_task",
          id: "sql-l4-a1",
          title: "Funnel checklist",
          skillNodeId: "sql-funnels",
          xp: 25,
          prompt: "You're building a visit → signup → activation funnel for last month. Check off each element your query needs.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "One CTE per funnel step, each with distinct user_ids" },
            { id: "c2", text: "A consistent date window applied to every step" },
            { id: "c3", text: "LEFT JOINs from the first step so drop-offs stay visible" },
            { id: "c4", text: "Step ordering enforced (activation must come after signup)" },
          ],
          successFeedback: "That's a defensible funnel: clean steps, one window, visible drop-offs, enforced ordering.",
          reviewFeedback:
            "Each item guards against a classic funnel bug — skipping step ordering, for example, counts users who activated before they technically signed up.",
        },
      ],
    },
  ],
};
