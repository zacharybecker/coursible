// Regenerates the starter-course catalog through the real generation
// pipeline and checks the output into the repo as JSON. Requires
// MOONSHOT_API_KEY (default Kimi provider) or, with
// GENERATION_PROVIDER=anthropic, ANTHROPIC_API_KEY. Run all or a subset:
//   npx tsx scripts/generate-starters.ts
//   npx tsx scripts/generate-starters.ts git-essentials docker-fundamentals

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import type { WizardAnswers } from "@/lib/types";
import { getModelClient } from "@/lib/generation/client";
import { generateCourse } from "@/lib/generation/pipeline";

interface StarterBrief {
  slug: string;
  answers: WizardAnswers;
}

const BRIEFS: StarterBrief[] = [
  {
    slug: "docker-fundamentals",
    answers: {
      outcome: "Confidently build, run, and debug Docker containers for my team's services",
      knowledge: "beginner",
      time: "25",
      style: "mix",
      sources: [],
    },
  },
  {
    slug: "git-essentials",
    answers: {
      outcome:
        "Use Git day-to-day without fear — branch, merge, resolve conflicts, and recover from mistakes",
      knowledge: "some",
      time: "25",
      style: "mix",
      sources: [],
    },
  },
  {
    slug: "sql-analytics",
    answers: {
      outcome:
        "Answer real business questions by writing my own SQL queries against our analytics database",
      knowledge: "beginner",
      time: "25",
      style: "mix",
      sources: [],
    },
  },
  {
    slug: "python-automation",
    answers: {
      outcome: "Automate boring work tasks (files, spreadsheets, APIs) with small Python scripts",
      knowledge: "some",
      time: "25",
      style: "hands_on",
      sources: [],
    },
  },
  {
    slug: "markdown-basics",
    answers: {
      outcome: "Write clean docs, READMEs, and PR descriptions in Markdown",
      knowledge: "beginner",
      time: "10",
      style: "reading",
      sources: [],
    },
  },
  {
    slug: "ci-cd-pipelines",
    answers: {
      outcome: "Set up and maintain a CI/CD pipeline that tests and deploys our app automatically",
      knowledge: "some",
      time: "25",
      style: "scenarios",
      sources: [],
    },
  },
  {
    slug: "web-dev-foundations",
    answers: {
      outcome: "Build and ship a simple interactive website with HTML, CSS, and JavaScript",
      knowledge: "beginner",
      time: "25",
      style: "hands_on",
      sources: [],
    },
  },
  {
    slug: "linux-command-line",
    answers: {
      outcome:
        "Work efficiently in a Linux terminal — navigate, inspect logs, and manage processes on our servers",
      knowledge: "beginner",
      time: "25",
      style: "mix",
      sources: [],
    },
  },
  {
    slug: "kubernetes-basics",
    answers: {
      outcome: "Deploy and troubleshoot a service on our Kubernetes cluster",
      knowledge: "some",
      time: "25",
      style: "scenarios",
      sources: [],
    },
  },
];

const OUT_DIR = path.join(process.cwd(), "lib", "data", "starter-courses");

async function main() {
  const requiredKey =
    process.env.GENERATION_PROVIDER === "anthropic" ? "ANTHROPIC_API_KEY" : "MOONSHOT_API_KEY";
  if (!process.env[requiredKey]) {
    console.error(`${requiredKey} is not set. Add it to .env or the environment.`);
    process.exit(1);
  }
  const requested = process.argv.slice(2);
  const briefs = requested.length > 0 ? BRIEFS.filter((b) => requested.includes(b.slug)) : BRIEFS;
  if (briefs.length === 0) {
    console.error(`No briefs match: ${requested.join(", ")}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const brief of briefs) {
    console.log(`Generating ${brief.slug}…`);
    const content = await generateCourse(getModelClient(), brief.answers, {
      contentId: `content-${brief.slug}`,
      onStatus: (status) => console.log(`  ${brief.slug}: ${status}`),
    });
    const file = path.join(OUT_DIR, `${brief.slug}.json`);
    fs.writeFileSync(file, JSON.stringify(content, null, 2) + "\n");
    console.log(`  wrote ${file} (${content.lessons.length} lessons)`);
  }
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
