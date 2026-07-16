import type { CourseContent } from "@/lib/types";

/** Tiny course — seeded as "archived" in the user's library. */
export const markdownBasics: CourseContent = {
  contentId: "content-markdown-basics",
  title: "Markdown & Docs Basics",
  description: "Write clean READMEs, docs, and notes in Markdown.",
  outcome: "Write a professional README for any project",
  tags: ["Writing", "Docs"],
  estimatedHours: 2,
  skillNodes: [
    {
      id: "md-syntax",
      title: "Core Syntax",
      description: "Headings, lists, links, and code blocks.",
      prereqIds: [],
      lessonIds: ["md-l1"],
      position: { col: 0, row: 0 },
    },
    {
      id: "md-readme",
      title: "Great READMEs",
      description: "Structure a README people actually read.",
      prereqIds: ["md-syntax"],
      lessonIds: ["md-l2"],
      position: { col: 1, row: 0 },
    },
  ],
  lessons: [
    {
      id: "md-l1",
      title: "The syntax that matters",
      description: "90% of Markdown is six constructs.",
      skillNodeId: "md-syntax",
      estimatedMinutes: 10,
      activities: [
        {
          type: "explanation_check",
          id: "md-l1-a1",
          title: "Six constructs",
          skillNodeId: "md-syntax",
          xp: 10,
          content:
            "Nearly all Markdown you'll write uses six constructs: `#` headings, `**bold**`, `-` bullet lists, `[text](url)` links, backtick `code`, and triple-backtick code blocks. Everything else is garnish.",
          questions: [
            {
              id: "q1",
              prompt: "How do you make a link in Markdown?",
              options: [
                { id: "a", text: "[link text](https://example.com)" },
                { id: "b", text: "(link text)[https://example.com]" },
                { id: "c", text: "<a>link text</a> only" },
              ],
              correctOptionId: "a",
              explanation: "Square brackets for the text, parentheses for the URL — in that order.",
            },
          ],
        },
      ],
    },
    {
      id: "md-l2",
      title: "READMEs people read",
      description: "Lead with what it is and how to run it.",
      skillNodeId: "md-readme",
      estimatedMinutes: 12,
      activities: [
        {
          type: "applied_task",
          id: "md-l2-a1",
          title: "README checklist",
          skillNodeId: "md-readme",
          xp: 15,
          prompt: "Draft a README for one of your projects. Check off each section as you write it.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "One-sentence description of what the project does" },
            { id: "c2", text: "Quick-start: the exact commands to run it" },
            { id: "c3", text: "A usage example with expected output" },
          ],
          successFeedback: "That covers the three questions every visitor has: what is it, how do I run it, what does it look like working.",
          reviewFeedback: "Keep it to what a first-time visitor needs — the quick-start commands are the section people actually copy-paste.",
        },
      ],
    },
  ],
};
