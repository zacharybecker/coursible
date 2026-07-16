import type { CourseContent } from "@/lib/types";

/** Catalog-only starter course. */
export const pythonAutomation: CourseContent = {
  contentId: "content-python-automation",
  title: "Python Automation Basics",
  description: "Automate the boring stuff: files, spreadsheets, and scheduled scripts with Python.",
  outcome: "Automate a repetitive weekly task at work end-to-end",
  tags: ["Python", "Automation", "Scripting"],
  estimatedHours: 5,
  skillNodes: [
    {
      id: "py-scripts",
      title: "Scripts & Files",
      description: "Read, write, and organize files with Python.",
      prereqIds: [],
      lessonIds: ["py-l1"],
      position: { col: 0, row: 0 },
    },
    {
      id: "py-data",
      title: "Spreadsheets & CSV",
      description: "Process tabular data without opening Excel.",
      prereqIds: ["py-scripts"],
      lessonIds: ["py-l2"],
      position: { col: 1, row: 0 },
    },
    {
      id: "py-schedule",
      title: "Scheduling",
      description: "Make scripts run themselves.",
      prereqIds: ["py-data"],
      lessonIds: ["py-l3"],
      position: { col: 2, row: 0 },
    },
  ],
  lessons: [
    {
      id: "py-l1",
      title: "Files without fear",
      description: "Walk directories and process files.",
      skillNodeId: "py-scripts",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "py-l1-a1",
          title: "pathlib basics",
          skillNodeId: "py-scripts",
          xp: 10,
          content:
            "Modern Python file work goes through `pathlib`. A `Path` object knows how to join paths (`folder / \"file.txt\"`), test existence (`.exists()`), and iterate a directory (`.glob(\"*.pdf\")`). It handles Windows/Mac path separators for you — string concatenation with `/` or `\\\\` is the classic source of scripts that only work on the author's machine.",
          questions: [
            {
              id: "q1",
              prompt: "Why prefer pathlib over building paths with string concatenation?",
              options: [
                { id: "a", text: "Paths behave correctly across operating systems" },
                { id: "b", text: "Strings can't hold file paths in Python" },
                { id: "c", text: "pathlib is faster at reading files" },
              ],
              correctOptionId: "a",
              explanation: "Path separators differ across OSes; pathlib abstracts that away so scripts stay portable.",
            },
          ],
        },
      ],
    },
    {
      id: "py-l2",
      title: "CSV in, insight out",
      description: "Process a spreadsheet export with csv/pandas.",
      skillNodeId: "py-data",
      estimatedMinutes: 15,
      activities: [
        {
          type: "scenario_decision",
          id: "py-l2-a1",
          title: "The messy export",
          skillNodeId: "py-data",
          xp: 15,
          scenario:
            "Your weekly sales CSV sometimes arrives with an extra header row and inconsistent capitalization in the region column. Your script feeds a report your boss reads. How do you handle the mess?",
          choices: [
            {
              id: "a",
              text: "Normalize on read: skip bad headers, lowercase/strip region values, and fail loudly if columns are missing",
              outcome: "The script survives the next weird export and emails you an error instead of a wrong report when something truly new breaks.",
              rationale: "Defensive normalization plus loud failure is the automation sweet spot — silently wrong reports are worse than no report.",
              correct: true,
            },
            {
              id: "b",
              text: "Assume the file is clean; fix it by hand when the report looks off",
              outcome: "Three weeks later 'EMEA ' with a trailing space becomes its own region in the boss's chart.",
              rationale: "If a human must inspect the output every week, you haven't automated the task — you've moved it.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "py-l3",
      title: "Set it and forget it",
      description: "Schedule your script to run weekly.",
      skillNodeId: "py-schedule",
      estimatedMinutes: 12,
      activities: [
        {
          type: "applied_task",
          id: "py-l3-a1",
          title: "Automation readiness checklist",
          skillNodeId: "py-schedule",
          xp: 20,
          prompt: "Before scheduling your script to run unattended every Monday, check off what it needs.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "Runs start-to-finish with no prompts or manual input" },
            { id: "c2", text: "Uses absolute paths (or paths relative to the script, not the shell)" },
            { id: "c3", text: "Writes a log file recording what it did" },
            { id: "c4", text: "Notifies you on failure instead of failing silently" },
          ],
          successFeedback: "That script is ready to live on a schedule — you'll hear about problems from the log and alerts, not from your boss.",
          reviewFeedback: "Every unchecked item is a way scheduled scripts die silently. The paths one bites almost everyone once.",
        },
      ],
    },
  ],
};
