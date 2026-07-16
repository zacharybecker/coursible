import type { CourseContent } from "@/lib/types";

/** Small course — seeded as "completed" in the user's library. */
export const gitEssentials: CourseContent = {
  contentId: "content-git-essentials",
  title: "Git Essentials",
  description: "Commits, branches, and merges — the daily Git workflow every developer needs.",
  outcome: "Work confidently on a shared codebase with branches and pull requests",
  tags: ["Git", "Tools", "Collaboration"],
  estimatedHours: 4,
  skillNodes: [
    {
      id: "git-basics",
      title: "Commits & History",
      description: "Track changes with commits.",
      prereqIds: [],
      lessonIds: ["git-l1"],
      position: { col: 0, row: 0 },
    },
    {
      id: "git-branches",
      title: "Branching",
      description: "Work in parallel without stepping on toes.",
      prereqIds: ["git-basics"],
      lessonIds: ["git-l2"],
      position: { col: 1, row: 0 },
    },
    {
      id: "git-collab",
      title: "Collaboration",
      description: "Remotes, pushes, and pull requests.",
      prereqIds: ["git-branches"],
      lessonIds: ["git-l3"],
      position: { col: 2, row: 0 },
    },
  ],
  lessons: [
    {
      id: "git-l1",
      title: "Your first commits",
      description: "Stage and commit changes with a clear history.",
      skillNodeId: "git-basics",
      estimatedMinutes: 12,
      activities: [
        {
          type: "explanation_check",
          id: "git-l1-a1",
          title: "The staging area",
          skillNodeId: "git-basics",
          xp: 10,
          content:
            "Git has a two-step save: you **stage** the changes you want (`git add`), then **commit** the staged set with a message (`git commit`). The staging area lets you commit *some* of your edits — a focused, reviewable unit — instead of everything you've touched.",
          questions: [
            {
              id: "q1",
              prompt: "You've edited five files but only want two in this commit. What makes that possible?",
              options: [
                { id: "a", text: "The staging area — add just those two files" },
                { id: "b", text: "Committing always includes every modified file" },
                { id: "c", text: "Deleting the other three files first" },
              ],
              correctOptionId: "a",
              explanation: "`git add` those two files, then commit — the other edits stay in your working tree for a later commit.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "git-l1-a2",
          title: "Make a commit",
          skillNodeId: "git-basics",
          xp: 15,
          prompt: "Write the command that commits your staged changes with the message \"add login form\".",
          submissionType: "command",
          expectedPatterns: ["git\\s+commit", "(-m|--message)", "add login form"],
          successFeedback: "`git commit -m \"add login form\"` — short, imperative, describes the change.",
          reviewFeedback: "Expected something like `git commit -m \"add login form\"` — the `-m` flag supplies the message inline.",
        },
      ],
    },
    {
      id: "git-l2",
      title: "Branching without fear",
      description: "Create, switch, and merge branches.",
      skillNodeId: "git-branches",
      estimatedMinutes: 15,
      activities: [
        {
          type: "scenario_decision",
          id: "git-l2-a1",
          title: "Where do you build the feature?",
          skillNodeId: "git-branches",
          xp: 15,
          scenario:
            "You're starting a multi-day feature on a team repo. Main gets several merges a day from teammates. Where do you do your work?",
          choices: [
            {
              id: "a",
              text: "On a feature branch created from the latest main",
              outcome: "You work in isolation, rebase or merge main when you choose, and open a clean PR when ready.",
              rationale: "Branches are cheap isolation — your half-done work never blocks teammates, and their merges never surprise you mid-edit.",
              correct: true,
            },
            {
              id: "b",
              text: "Directly on main, committing as you go",
              outcome: "Your half-finished feature ships to everyone who pulls, and a teammate's deploy breaks that afternoon.",
              rationale: "Committing incomplete work to a shared main pushes your in-progress state onto everyone. That's what branches prevent.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "git-l3",
      title: "Working with remotes",
      description: "Push, pull, and open pull requests.",
      skillNodeId: "git-collab",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "git-l3-a1",
          title: "Push and pull",
          skillNodeId: "git-collab",
          xp: 10,
          content:
            "Your local repository and the remote (e.g. GitHub) are separate copies. `git push` uploads your commits; `git pull` fetches and merges the remote's new commits into your branch. A **pull request** is the remote host's review workflow: propose your branch, get review, merge into main.",
          questions: [
            {
              id: "q1",
              prompt: "A teammate says your fix 'isn't on GitHub'. You committed it locally. What's missing?",
              options: [
                { id: "a", text: "`git push` — commits are local until pushed" },
                { id: "b", text: "Nothing; commits sync automatically" },
                { id: "c", text: "`git pull` to send your changes up" },
              ],
              correctOptionId: "a",
              explanation: "Commits live in your local repo until you push them. (`git pull` brings changes down, not up.)",
            },
          ],
        },
      ],
    },
  ],
};
