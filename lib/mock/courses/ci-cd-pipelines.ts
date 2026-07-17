import type { CourseContent } from "@/lib/types";

/**
 * Starter course: continuous integration and delivery, from first principles
 * to real deployment strategies. Vendor-neutral — concepts map to GitHub
 * Actions, GitLab CI, Jenkins, CircleCI, and friends.
 */
export const ciCdPipelines: CourseContent = {
  contentId: "content-ci-cd-pipelines",
  title: "CI/CD Pipelines & DevOps Basics",
  description:
    "Automate the path from commit to production: build, test, and deploy with confidence using continuous integration and delivery.",
  outcome: "Design and reason about a production-grade CI/CD pipeline for a real service",
  tags: ["DevOps", "CI/CD", "Automation"],
  estimatedHours: 7,
  skillNodes: [
    {
      id: "cicd-intro",
      title: "What CI/CD Is",
      description: "The problems continuous integration and delivery solve.",
      prereqIds: [],
      lessonIds: ["cicd-l1"],
      position: { col: 0, row: 1 },
    },
    {
      id: "pipeline-anatomy",
      title: "Pipeline Anatomy",
      description: "Stages, jobs, steps, and triggers.",
      prereqIds: ["cicd-intro"],
      lessonIds: ["cicd-l2"],
      position: { col: 1, row: 1 },
    },
    {
      id: "testing-gates",
      title: "Automated Testing Gates",
      description: "Use tests to block bad code from advancing.",
      prereqIds: ["pipeline-anatomy"],
      lessonIds: ["cicd-l3"],
      position: { col: 2, row: 0 },
    },
    {
      id: "build-artifacts",
      title: "Build Artifacts",
      description: "Produce one immutable build and promote it.",
      prereqIds: ["pipeline-anatomy"],
      lessonIds: ["cicd-l4"],
      position: { col: 2, row: 2 },
    },
    {
      id: "deploy-strategies",
      title: "Deployment Strategies",
      description: "Blue/green, canary, and safe rollbacks.",
      prereqIds: ["testing-gates", "build-artifacts"],
      lessonIds: ["cicd-l5", "cicd-l6"],
      position: { col: 3, row: 1 },
    },
    {
      id: "config-management",
      title: "Environments & Config",
      description: "Manage secrets and per-environment configuration.",
      prereqIds: ["deploy-strategies"],
      lessonIds: ["cicd-l7"],
      position: { col: 4, row: 0 },
    },
    {
      id: "monitoring-feedback",
      title: "Monitoring & Feedback",
      description: "Close the loop with metrics, alerts, and fast feedback.",
      prereqIds: ["deploy-strategies"],
      lessonIds: ["cicd-l8"],
      position: { col: 4, row: 2 },
    },
  ],
  lessons: [
    {
      id: "cicd-l1",
      title: "Why CI/CD exists",
      description: "The pain of manual integration and releases, and what automation fixes.",
      skillNodeId: "cicd-intro",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "cicd-l1-a1",
          title: "Continuous integration vs. continuous delivery",
          skillNodeId: "cicd-intro",
          xp: 10,
          content:
            "**Continuous integration (CI)** is the practice of merging every developer's work into a shared branch frequently — many times a day — and automatically building and testing each change. The goal is to catch conflicts and breakages within minutes of the commit that caused them, while the change is small and the author still remembers it.\n\n**Continuous delivery (CD)** extends that: every change that passes the pipeline is automatically packaged and kept in a deployable state, so releasing is a routine, low-drama decision rather than a rare, risky event. **Continuous deployment** goes one step further — every passing change ships to production automatically, with no human gate.\n\nThe underlying bet is the same: small, frequent, automated steps are far safer than large, infrequent, manual ones.",
          questions: [
            {
              id: "q1",
              prompt: "What is the core idea behind continuous integration?",
              options: [
                { id: "a", text: "Merge and automatically test small changes frequently, so breakages surface fast" },
                { id: "b", text: "Deploy to production on a fixed weekly schedule" },
                { id: "c", text: "Let each developer work in isolation until the release date" },
              ],
              correctOptionId: "a",
              explanation:
                "CI is about integrating often and validating each integration automatically, so problems are found while the change is small and fresh.",
            },
            {
              id: "q2",
              prompt: "What distinguishes continuous *deployment* from continuous *delivery*?",
              options: [
                { id: "a", text: "Deployment automatically ships every passing change to production with no human gate" },
                { id: "b", text: "Delivery runs tests and deployment skips them" },
                { id: "c", text: "Deployment only applies to mobile apps" },
              ],
              correctOptionId: "a",
              explanation:
                "Both keep changes releasable; continuous deployment removes the final manual approval and pushes every green build to production automatically.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "cicd-l1-a2",
          title: "The Friday-night release",
          skillNodeId: "cicd-intro",
          xp: 15,
          scenario:
            "Your team integrates everyone's work once a month into a giant release, then spends a tense weekend deploying it manually. Bugs are common and hard to trace. A teammate proposes moving to CI/CD. What is the strongest argument for the change?",
          choices: [
            {
              id: "a",
              text: "Smaller, more frequent integrations make failures easier to locate and cheaper to fix",
              outcome:
                "The team switches to merging daily behind automated tests. When something breaks, it's almost always in the handful of changes from that day.",
              rationale:
                "The biggest win of CI/CD isn't speed for its own sake — it's shrinking the blast radius of each change so failures are small, isolated, and quick to diagnose.",
              correct: true,
            },
            {
              id: "b",
              text: "CI/CD means you no longer need to write tests, since the pipeline handles quality",
              outcome:
                "The team automates a pipeline with almost no tests. It ships broken code faster than ever — now automatically.",
              rationale:
                "A pipeline only enforces the checks you give it. CI/CD makes good tests more valuable, not unnecessary.",
              correct: false,
            },
            {
              id: "c",
              text: "Automation guarantees you will never have a production incident again",
              outcome:
                "The team sells leadership on zero incidents, then loses trust the first time something slips through.",
              rationale:
                "CI/CD reduces risk and speeds recovery; it does not eliminate incidents. Overpromising undermines the real, honest benefits.",
              correct: false,
            },
          ],
        },
        {
          type: "explanation_check",
          id: "cicd-l1-a3",
          title: "The feedback-speed principle",
          skillNodeId: "cicd-intro",
          xp: 10,
          content:
            "The value of a pipeline is proportional to how fast it gives honest feedback. A commit that triggers a five-minute build-and-test run tells the author what's wrong while they're still in context. A pipeline that takes two hours — or that people routinely ignore because it's flaky — provides feedback so late it barely counts.\n\nThat is why teams obsess over keeping pipelines **fast** and **trustworthy**: caching dependencies, running tests in parallel, and ruthlessly fixing flaky tests. A green checkmark has to mean something, every time.",
          questions: [
            {
              id: "q1",
              prompt: "Why do teams treat a flaky test (one that fails randomly) as a serious problem?",
              options: [
                { id: "a", text: "It erodes trust in the pipeline, so people start ignoring real failures too" },
                { id: "b", text: "Flaky tests always indicate a hardware fault" },
                { id: "c", text: "Flaky tests make the repository larger" },
              ],
              correctOptionId: "a",
              explanation:
                "Once a green checkmark stops being reliable, developers rerun or bypass failures out of habit — and real regressions slip through with them.",
            },
          ],
        },
      ],
    },
    {
      id: "cicd-l2",
      title: "Anatomy of a pipeline",
      description: "Triggers, stages, jobs, and steps — the vocabulary of every CI system.",
      skillNodeId: "pipeline-anatomy",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "cicd-l2-a1",
          title: "Triggers, stages, jobs, steps",
          skillNodeId: "pipeline-anatomy",
          xp: 10,
          content:
            "Almost every CI system shares the same skeleton, even if the names differ slightly.\n\nA **trigger** is the event that starts a pipeline: a push to a branch, an opened pull request, a schedule, or a manual button.\n\nA **stage** is a phase of the pipeline — commonly *build*, *test*, then *deploy* — that runs in order. Within a stage, **jobs** run (often in parallel) on isolated runners. Each job is an ordered list of **steps**: individual shell commands or reusable actions like \"check out the code\" or \"install dependencies.\"\n\nStages run sequentially and typically stop the pipeline if one fails, so a failing test stage prevents the deploy stage from ever running. That ordering is what makes the pipeline a *gate*, not just a script.",
          questions: [
            {
              id: "q1",
              prompt: "Your `test` stage fails. What happens to the `deploy` stage that comes after it?",
              options: [
                { id: "a", text: "It is skipped — a failed stage stops the pipeline before deploy runs" },
                { id: "b", text: "It runs anyway, since stages are independent" },
                { id: "c", text: "It runs, but only on the main branch" },
              ],
              correctOptionId: "a",
              explanation:
                "Stages run in order and a failure halts progression, so deploy never runs on a build whose tests failed. That sequencing is the whole point of a gate.",
            },
            {
              id: "q2",
              prompt: "Two independent jobs in the same stage — linting and unit tests — have no dependency on each other. How should they run?",
              options: [
                { id: "a", text: "In parallel, to shorten total pipeline time" },
                { id: "b", text: "Strictly one after the other, always" },
                { id: "c", text: "In separate pipelines triggered by separate commits" },
              ],
              correctOptionId: "a",
              explanation:
                "Independent jobs in a stage run in parallel on separate runners, cutting wall-clock time without changing the result.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "cicd-l2-a2",
          title: "Sketch a minimal pipeline",
          skillNodeId: "pipeline-anatomy",
          xp: 20,
          prompt:
            "You're defining the first pipeline for a small web service. Check off the elements a minimal but responsible pipeline should include before you'd trust it to gate merges.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "A trigger on pull requests and on pushes to the main branch" },
            { id: "c2", text: "A build/install step that fails loudly if dependencies don't resolve" },
            { id: "c3", text: "An automated test job that must pass for the pipeline to go green" },
            { id: "c4", text: "A lint or static-analysis check running alongside tests" },
            { id: "c5", text: "A deploy stage that only runs on the main branch, after tests pass" },
          ],
          successFeedback:
            "That's a solid starter pipeline: it gates every PR on build + tests + lint, and only deploys from main once those pass. You can grow it from here.",
          reviewFeedback:
            "Each item earns its place. Skip the PR trigger and broken code merges silently; skip the branch condition on deploy and every feature branch tries to ship to production.",
        },
        {
          type: "scenario_decision",
          id: "cicd-l2-a3",
          title: "Where does this step belong?",
          skillNodeId: "pipeline-anatomy",
          xp: 15,
          scenario:
            "Your pipeline runs a slow end-to-end test suite (12 minutes) and a fast unit test suite (40 seconds). Developers complain they wait 13 minutes on every tiny pull request before seeing any result. How do you restructure?",
          choices: [
            {
              id: "a",
              text: "Run unit tests first as a fast gate; run the slow end-to-end suite as a later job that only blocks the merge, not early feedback",
              outcome:
                "Developers get a pass/fail on unit tests in under a minute. Most mistakes are caught there; the slow suite still guards the merge.",
              rationale:
                "Ordering cheap, high-signal checks before expensive ones gives fast feedback on the common failures while still enforcing the thorough checks before code advances.",
              correct: true,
            },
            {
              id: "b",
              text: "Delete the end-to-end tests so the pipeline is always fast",
              outcome:
                "The pipeline is quick and useless — integration bugs the unit tests can't see now reach production unchecked.",
              rationale:
                "Speed by deleting your most realistic tests trades a real safety net for a cosmetic metric.",
              correct: false,
            },
            {
              id: "c",
              text: "Move all tests to run only nightly, off the pull-request path",
              outcome:
                "Pull requests are instant, but broken code merges all day and the nightly run becomes a pile of failures nobody can attribute.",
              rationale:
                "Pulling tests off the PR path defeats CI — the whole point is validating each change as it integrates, not hours later.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "cicd-l3",
      title: "Testing gates",
      description: "Turn a test suite into a wall bad code can't climb.",
      skillNodeId: "testing-gates",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "cicd-l3-a1",
          title: "The testing pyramid in a pipeline",
          skillNodeId: "testing-gates",
          xp: 10,
          content:
            "A healthy pipeline runs layers of tests that trade off speed against realism. The **testing pyramid** describes the ideal mix: many fast **unit tests** at the base, fewer **integration tests** in the middle, and a small number of slow, high-value **end-to-end tests** at the top.\n\nThe pipeline uses these as **gates**: a job's non-zero exit code marks the check as failed, and a required check that fails blocks the merge. The trick is to require checks that are both meaningful and stable. A required check that fails randomly trains people to bypass it; an optional check that catches real bugs gets ignored until it's too late.\n\nCoverage thresholds and static analysis (type checks, linters, security scanners) are gates too — they just measure the code rather than run it.",
          questions: [
            {
              id: "q1",
              prompt: "Why does the testing pyramid favor many unit tests and few end-to-end tests?",
              options: [
                { id: "a", text: "Unit tests are fast and precise; end-to-end tests are slow and broad, so you want just enough of them" },
                { id: "b", text: "End-to-end tests are less accurate than unit tests" },
                { id: "c", text: "Unit tests can test things end-to-end tests cannot reach at all" },
              ],
              correctOptionId: "a",
              explanation:
                "Unit tests give fast, localized feedback and are cheap to run in bulk; end-to-end tests are realistic but slow and brittle, so a few well-chosen ones go a long way.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "cicd-l3-a2",
          title: "A required check keeps failing",
          skillNodeId: "testing-gates",
          xp: 15,
          scenario:
            "One required end-to-end test fails on roughly one in five runs, with no code change — it's flaky. Developers have started clicking \"re-run\" until it passes. What's the right response?",
          choices: [
            {
              id: "a",
              text: "Quarantine the flaky test (remove it from the required gate) and open a ticket to fix or delete it",
              outcome:
                "The gate is trustworthy again immediately, and the flaky test is tracked for a real fix instead of being worked around silently.",
              rationale:
                "A flaky required check is worse than no check — it teaches people to ignore red. Quarantine restores trust while you address the root cause honestly.",
              correct: true,
            },
            {
              id: "b",
              text: "Leave it required and tell everyone to just keep re-running until it's green",
              outcome:
                "\"Re-run until green\" becomes the team reflex — and now applies to genuine failures too. A real regression sails through on the third try.",
              rationale:
                "Normalizing re-runs destroys the meaning of a passing pipeline. The gate stops gating.",
              correct: false,
            },
            {
              id: "c",
              text: "Configure the pipeline to automatically retry that test up to five times and pass if any attempt succeeds",
              outcome:
                "The flakiness is hidden, not fixed, and now a test that's genuinely broken 90% of the time can still pass by luck.",
              rationale:
                "Automatic retries can mask flakiness for stable tests, but making a required gate pass on any-of-five attempts guts its reliability. Fix the test, don't paper over it.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "cicd-l3-a3",
          title: "Fail the build on a failing test",
          skillNodeId: "testing-gates",
          xp: 20,
          prompt:
            "In a pipeline step, you run your test command. For the step to gate correctly, the command must return a non-zero exit code when tests fail. Write a shell command that runs `npm test` and, crucially, lets its exit code propagate so the CI step fails when tests fail. (Just the command as you'd put it in a pipeline step.)",
          submissionType: "command",
          expectedPatterns: ["npm\\s+(run\\s+)?test"],
          successFeedback:
            "Right — a bare `npm test` exits non-zero when tests fail, and CI reads that exit code to mark the step failed. The mistake to avoid is appending something like `|| true`, which swallows the failure and makes every run green.",
          reviewFeedback:
            "We were looking for a plain `npm test`. The key idea: never suppress the exit code (no trailing `|| true`), because CI decides pass/fail from that code.",
        },
      ],
    },
    {
      id: "cicd-l4",
      title: "Build once, promote everywhere",
      description: "Immutable artifacts and why you never rebuild per environment.",
      skillNodeId: "build-artifacts",
      estimatedMinutes: 12,
      activities: [
        {
          type: "explanation_check",
          id: "cicd-l4-a1",
          title: "Build artifacts and immutability",
          skillNodeId: "build-artifacts",
          xp: 10,
          content:
            "A **build artifact** is the packaged, ready-to-run output of your build stage — a compiled binary, a JavaScript bundle, a container image, a `.jar`. The golden rule is **build once, deploy many**: you produce a single artifact from a single commit, then promote that exact artifact through staging and into production unchanged.\n\nWhy not just rebuild in each environment? Because two builds of the \"same\" code can differ — a dependency published a new patch, a base image shifted, a timestamp leaked in. If you test artifact A in staging but build a fresh artifact B for production, you deployed something you never tested. Immutable, versioned artifacts make a deploy reproducible: the thing that passed the gates is the exact thing that ships.",
          questions: [
            {
              id: "q1",
              prompt: "Why is 'build once, deploy many' safer than rebuilding the app for each environment?",
              options: [
                { id: "a", text: "The exact artifact tested in staging is the one that reaches production, so you never ship something untested" },
                { id: "b", text: "Rebuilding is against most CI tools' terms of service" },
                { id: "c", text: "Rebuilding always produces a larger artifact" },
              ],
              correctOptionId: "a",
              explanation:
                "Rebuilding per environment risks subtle drift (new dependency versions, changed base images). Promoting one immutable artifact guarantees production runs exactly what passed the gates.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "cicd-l4-a2",
          title: "Staging passed, production broke",
          skillNodeId: "build-artifacts",
          xp: 15,
          scenario:
            "Your team builds the app separately in each environment. Staging looked perfect this morning, but the production build pulled a newly-released version of a logging library and crashes on startup. How should the team change its process?",
          choices: [
            {
              id: "a",
              text: "Build one versioned artifact from the commit, promote that same artifact from staging to production, and pin dependency versions",
              outcome:
                "The next release promotes the identical, already-tested artifact. The 'works in staging, breaks in prod' class of surprise disappears.",
              rationale:
                "Immutable artifacts plus pinned dependencies remove the drift between environments that caused the crash. You ship what you tested.",
              correct: true,
            },
            {
              id: "b",
              text: "Add a step that automatically upgrades all dependencies to latest right before the production build",
              outcome:
                "Production now deliberately pulls untested versions on every release — the exact failure mode, made routine.",
              rationale:
                "Upgrading dependencies at deploy time maximizes drift. Dependency updates belong earlier, tested through the pipeline like any other change.",
              correct: false,
            },
            {
              id: "c",
              text: "Only ever deploy on days when no dependency has published an update",
              outcome:
                "Releases stall indefinitely, since popular libraries publish constantly, and the underlying drift problem is untouched.",
              rationale:
                "This tries to avoid drift by avoiding releasing. The real fix is making the artifact reproducible, not freezing the calendar.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "cicd-l4-a3",
          title: "Version an artifact for promotion",
          skillNodeId: "build-artifacts",
          xp: 15,
          prompt:
            "You build a container image in CI and want to tag it with the exact commit it was built from, so it can be traced and promoted unchanged. Write a `docker build` command that tags the image `myservice` with the value of the environment variable `GIT_SHA` (e.g. `myservice:$GIT_SHA`) using the current directory as the build context.",
          submissionType: "command",
          expectedPatterns: ["docker\\s+build", "(-t|--tag)\\s*myservice:\\$?\\{?GIT_SHA", "\\."],
          successFeedback:
            "Exactly — tagging with the commit SHA gives every artifact a unique, traceable identity you can promote from staging to production without ambiguity.",
          reviewFeedback:
            "A working version is `docker build -t myservice:$GIT_SHA .` — tag with the commit SHA so the artifact is uniquely identified and don't forget the `.` build context.",
        },
      ],
    },
    {
      id: "cicd-l5",
      title: "Deployment strategies",
      description: "Blue/green and canary releases that limit blast radius.",
      skillNodeId: "deploy-strategies",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "cicd-l5-a1",
          title: "Blue/green and canary",
          skillNodeId: "deploy-strategies",
          xp: 10,
          content:
            "How you cut over from the old version to the new one matters as much as what you're shipping.\n\nA **blue/green** deployment runs two identical environments: *blue* (current) serves all traffic while you deploy the new version to *green*. Once green is verified, you switch traffic over in one move. If something's wrong, you switch back to blue instantly — the old version was never torn down.\n\nA **canary** deployment releases the new version to a small slice of traffic first — say 5% of users — while watching error rates and latency. If the canary looks healthy, you gradually raise the percentage to 100%. If it misbehaves, you route that 5% back to the old version, having exposed only a fraction of users.\n\nBoth strategies share one aim: make the switch reversible and the blast radius small.",
          questions: [
            {
              id: "q1",
              prompt: "What is the defining feature of a canary deployment?",
              options: [
                { id: "a", text: "The new version takes a small percentage of traffic first while you watch its health" },
                { id: "b", text: "Two full environments run and you flip all traffic at once" },
                { id: "c", text: "The old version is deleted before the new one starts" },
              ],
              correctOptionId: "a",
              explanation:
                "A canary exposes a small slice of real traffic to the new version and scales up only if metrics stay healthy — limiting who's affected if it's bad.",
            },
            {
              id: "q2",
              prompt: "In a blue/green setup, why is rollback so fast?",
              options: [
                { id: "a", text: "The previous version (blue) is still running, so you just route traffic back to it" },
                { id: "b", text: "The new version is automatically rewritten to match the old code" },
                { id: "c", text: "Blue/green deployments never fail, so rollback isn't needed" },
              ],
              correctOptionId: "a",
              explanation:
                "Because blue is left intact while green takes over, reverting is just a traffic switch back to blue — no rebuild, no redeploy.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "cicd-l5-a2",
          title: "Choosing a strategy",
          skillNodeId: "deploy-strategies",
          xp: 15,
          scenario:
            "You're shipping a risky rewrite of your checkout service. You have solid metrics (error rate, latency, checkout success rate) and can route traffic by percentage. You want to catch problems using real production traffic while exposing as few paying customers as possible. Which approach fits best?",
          choices: [
            {
              id: "a",
              text: "Canary: send 5% of traffic to the new version, watch the metrics, and ramp up only if it stays healthy",
              outcome:
                "A latency regression appears at 5%. You catch it affecting a small fraction of users and roll that slice back before a wider release.",
              rationale:
                "With good metrics and percentage-based routing, a canary gives you real production signal at minimal customer exposure — ideal for a risky change.",
              correct: true,
            },
            {
              id: "b",
              text: "Deploy the rewrite to 100% of traffic at once during a low-traffic hour",
              outcome:
                "Fewer users are online, but everyone who checks out hits the regression at once. The blast radius is 'everyone shopping right now.'",
              rationale:
                "A big-bang cutover exposes all current users simultaneously. Low traffic reduces count, not the fraction affected — a canary is far safer here.",
              correct: false,
            },
            {
              id: "c",
              text: "Skip staged rollout; rely on your pre-production tests to guarantee it's fine",
              outcome:
                "The regression only appears under real traffic patterns your tests didn't reproduce, and every customer meets it.",
              rationale:
                "Tests are necessary but never a full substitute for observing real traffic. The point of a canary is catching what tests miss, safely.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "cicd-l5-a3",
          title: "Plan a canary rollout",
          skillNodeId: "deploy-strategies",
          xp: 20,
          prompt:
            "You're setting up a canary release for a new service version. Check off each element the rollout plan needs to be safe and decidable.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "A defined starting traffic percentage for the canary (e.g. 5%)" },
            { id: "c2", text: "Concrete health metrics to watch (error rate, latency, key business metric)" },
            { id: "c3", text: "Pass/fail thresholds that decide whether to ramp up or roll back" },
            { id: "c4", text: "A ramp schedule (e.g. 5% → 25% → 50% → 100%) with checks between steps" },
            { id: "c5", text: "An automatic or one-click rollback path if a threshold is breached" },
          ],
          successFeedback:
            "That's a decidable canary: you know how much traffic, what to measure, when to advance, and how to abort. No judgment calls made in a panic.",
          reviewFeedback:
            "Every item matters. Without explicit thresholds and a rollback path, a canary becomes 'ship a bit and hope' — you need the plan to make the go/no-go decision for you.",
        },
      ],
    },
    {
      id: "cicd-l6",
      title: "Rollbacks and safety nets",
      description: "Getting back to a known-good state fast when a deploy goes wrong.",
      skillNodeId: "deploy-strategies",
      estimatedMinutes: 12,
      activities: [
        {
          type: "explanation_check",
          id: "cicd-l6-a1",
          title: "Rollback vs. roll forward",
          skillNodeId: "deploy-strategies",
          xp: 10,
          content:
            "When a deploy misbehaves, you have two ways back to health. A **rollback** returns to the previous known-good artifact — fast, low-risk, and the default when you're unsure. A **roll forward** ships a new fix on top of the broken version — appropriate when rolling back is impossible or would itself cause harm.\n\nThe subtlety is **database migrations**. Code can usually roll back in seconds, but a migration that dropped a column or rewrote data may not reverse cleanly. That's why experienced teams write **backward-compatible migrations**: deploy the schema change in a way the old code can still tolerate, so a code rollback doesn't collide with a schema that has moved on. The rule of thumb: keep the previous version deployable at all times.",
          questions: [
            {
              id: "q1",
              prompt: "Your new release is failing and you're not sure why. What's usually the safest first move?",
              options: [
                { id: "a", text: "Roll back to the previous known-good artifact, then diagnose calmly" },
                { id: "b", text: "Debug in production until you find and hand-patch the bug live" },
                { id: "c", text: "Drop the database and restore from a month-old backup" },
              ],
              correctOptionId: "a",
              explanation:
                "Rollback restores a known-good state quickly and stops the bleeding, letting you investigate without the pressure of an active outage.",
            },
            {
              id: "q2",
              prompt: "Why can a database migration make rollback risky?",
              options: [
                { id: "a", text: "A schema change may not reverse cleanly, so old code may not match the new schema" },
                { id: "b", text: "Migrations permanently lock the CI pipeline" },
                { id: "c", text: "Databases cannot be used with blue/green deployments" },
              ],
              correctOptionId: "a",
              explanation:
                "If a migration altered the schema in a way the old code can't handle, rolling back the code alone leaves a mismatch — hence backward-compatible migrations.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "cicd-l6-a2",
          title: "A bad deploy at 2pm",
          skillNodeId: "deploy-strategies",
          xp: 15,
          scenario:
            "Ten minutes after a deploy, error rates spike and customers can't log in. The change didn't touch the database schema. You have a one-click rollback to the previous artifact. What do you do first?",
          choices: [
            {
              id: "a",
              text: "Roll back to the previous artifact immediately, confirm errors subside, then investigate the bad build",
              outcome:
                "Login recovers within a minute. With the incident over, you reproduce and fix the bug without customers watching.",
              rationale:
                "With no schema change blocking it, rollback is the fastest path to a healthy state. Stop the impact first; understand it second.",
              correct: true,
            },
            {
              id: "b",
              text: "Leave the broken version up while you read logs and try to hot-fix the root cause",
              outcome:
                "Customers stay locked out for 40 minutes while you debug under pressure — an outage that a 60-second rollback would have ended.",
              rationale:
                "Diagnosing before restoring service prioritizes curiosity over customers. Recover first, then debug the artifact you rolled back from.",
              correct: false,
            },
            {
              id: "c",
              text: "Announce the incident and wait to see if it resolves itself before acting",
              outcome:
                "It doesn't resolve; the impact simply continues while you watch. Time-to-recovery balloons for no reason.",
              rationale:
                "Hoping an active outage self-heals wastes the exact minutes a rollback exists to save.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "cicd-l7",
      title: "Environments and configuration",
      description: "Keep config and secrets out of your code and per-environment.",
      skillNodeId: "config-management",
      estimatedMinutes: 13,
      activities: [
        {
          type: "explanation_check",
          id: "cicd-l7-a1",
          title: "Config in the environment, not the code",
          skillNodeId: "config-management",
          xp: 10,
          content:
            "The same artifact runs in staging and production, so anything that *differs* between environments — database URLs, API endpoints, feature flags, credentials — must live *outside* the artifact. The common practice is to inject configuration through **environment variables** (or a secrets manager) at deploy time, so one immutable build adapts to each environment by what it's handed, not by being rebuilt.\n\n**Secrets** — passwords, tokens, private keys — get special handling: they're stored in a secrets manager or the CI system's encrypted variables, never committed to the repository. A secret in git is compromised the moment it's pushed, because history is forever and repositories get cloned widely. If a secret does leak, the only real fix is to **rotate** it (issue a new one and revoke the old), not just delete the file.",
          questions: [
            {
              id: "q1",
              prompt: "Why should per-environment settings like the database URL be injected via environment variables rather than baked into the build?",
              options: [
                { id: "a", text: "So one immutable artifact can run in every environment, differing only by injected config" },
                { id: "b", text: "Because environment variables load faster than config files" },
                { id: "c", text: "Because build tools can't read config files at all" },
              ],
              correctOptionId: "a",
              explanation:
                "Injecting config keeps the artifact immutable and environment-agnostic — the exact build tested in staging runs in production with different values handed to it.",
            },
            {
              id: "q2",
              prompt: "A developer accidentally committed an API key to the repo and then deleted it in a later commit. Is the key safe now?",
              options: [
                { id: "a", text: "No — it lives in git history and must be rotated (revoked and reissued)" },
                { id: "b", text: "Yes — deleting the file removes it everywhere" },
                { id: "c", text: "Yes, as long as the repository is private" },
              ],
              correctOptionId: "a",
              explanation:
                "Git history preserves the key, and clones/forks may already have it. The only safe response is to rotate the secret, not just delete the file.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "cicd-l7-a2",
          title: "Handling a new secret",
          skillNodeId: "config-management",
          xp: 15,
          scenario:
            "Your service needs a third-party payment API key that must be available in staging and production but must never appear in the codebase or logs. How do you wire it up?",
          choices: [
            {
              id: "a",
              text: "Store it in the CI/secrets manager as an encrypted variable and inject it as an environment variable at deploy time, per environment",
              outcome:
                "Each environment gets its own key at runtime; the repository stays clean and the value never appears in source or build logs.",
              rationale:
                "Encrypted secret storage plus runtime injection keeps secrets out of git and lets each environment use its own key — exactly the intended design.",
              correct: true,
            },
            {
              id: "b",
              text: "Commit it to a `config.prod.js` file so the app can always find it",
              outcome:
                "The key is now in git history permanently and in every clone of the repo — compromised the moment it's pushed.",
              rationale:
                "Any secret in the repository is exposed to everyone with access and forever in history. This is the classic mistake secrets managers exist to prevent.",
              correct: false,
            },
            {
              id: "c",
              text: "Paste it into the pipeline definition file in plaintext so CI can use it",
              outcome:
                "The pipeline file is in the repo too — same exposure, plus it often prints in build logs.",
              rationale:
                "Pipeline config lives in the repository and logs. Plaintext secrets there are just as leaked as anywhere else in source.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "cicd-l8",
      title: "Monitoring and the feedback loop",
      description: "Watch what you ship and feed what you learn back into the pipeline.",
      skillNodeId: "monitoring-feedback",
      estimatedMinutes: 14,
      activities: [
        {
          type: "explanation_check",
          id: "cicd-l8-a1",
          title: "Observability and DORA metrics",
          skillNodeId: "monitoring-feedback",
          xp: 10,
          content:
            "A deploy isn't done when the pipeline goes green — it's done when you've confirmed the change is healthy in production. That requires **observability**: logs, metrics (error rate, latency, throughput), and traces, plus **alerts** that page a human when something crosses a threshold.\n\nTeams also measure *themselves*. The widely-used **DORA metrics** capture delivery performance: **deployment frequency** (how often you ship), **lead time for changes** (commit to production), **change failure rate** (what fraction of deploys cause a problem), and **time to restore service** (how fast you recover). Notice these reward both speed *and* stability — shipping often is only good if failures stay rare and recovery stays fast.\n\nThe feedback loop closes when what you learn in production — a gap a test missed, an alert that fired too late — becomes a new test or a pipeline improvement, so the same class of problem can't recur silently.",
          questions: [
            {
              id: "q1",
              prompt: "The DORA metric 'time to restore service' measures what?",
              options: [
                { id: "a", text: "How quickly the team recovers from a failure in production" },
                { id: "b", text: "How long the CI pipeline takes to run" },
                { id: "c", text: "How many tests are in the suite" },
              ],
              correctOptionId: "a",
              explanation:
                "Time to restore captures recovery speed after an incident — a core stability metric, paired with change failure rate.",
            },
            {
              id: "q2",
              prompt: "Why do the DORA metrics pair throughput measures with stability measures?",
              options: [
                { id: "a", text: "To reward shipping often only when failures stay rare and recovery stays fast" },
                { id: "b", text: "Because stability metrics are optional and rarely tracked" },
                { id: "c", text: "Because deployment frequency is the only metric that matters" },
              ],
              correctOptionId: "a",
              explanation:
                "Measuring speed alone invites reckless shipping; pairing it with change failure rate and recovery time keeps fast delivery honest.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "cicd-l8-a2",
          title: "Closing the loop after an incident",
          skillNodeId: "monitoring-feedback",
          xp: 15,
          scenario:
            "A bug reached production because no test covered a specific edge case. You've rolled back and the incident is over. What best turns this into a lasting improvement?",
          choices: [
            {
              id: "a",
              text: "Write a regression test that reproduces the bug and add it to the pipeline's required checks",
              outcome:
                "The pipeline now fails if that exact bug ever returns. The gap the incident exposed is permanently closed.",
              rationale:
                "Converting an incident into a required test is the feedback loop working as intended — the system gets measurably harder to break the same way twice.",
              correct: true,
            },
            {
              id: "b",
              text: "Add a note to the team wiki reminding everyone to be careful about that edge case",
              outcome:
                "The note is forgotten within weeks and the edge case regresses in a future change, with nothing to catch it.",
              rationale:
                "Relying on human memory instead of an automated check leaves the same gap open. Documentation doesn't gate a pipeline.",
              correct: false,
            },
            {
              id: "c",
              text: "Conclude it was a one-off and move on without changing anything",
              outcome:
                "The identical bug resurfaces two months later, because nothing in the system changed to prevent it.",
              rationale:
                "Treating a preventable incident as bad luck wastes its main value — the chance to make the pipeline catch it next time.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "cicd-l8-a3",
          title: "Design the deploy-to-feedback loop",
          skillNodeId: "monitoring-feedback",
          xp: 20,
          prompt:
            "You're closing the loop between production and your pipeline. Check off the practices that make a healthy monitoring-and-feedback setup.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "Key metrics tracked in production (error rate, latency, a core business metric)" },
            { id: "c2", text: "Alerts that page a human when a metric crosses a defined threshold" },
            { id: "c3", text: "A post-incident habit of adding a regression test for anything that slipped through" },
            { id: "c4", text: "DORA-style tracking of deploy frequency, lead time, change failure rate, and recovery time" },
            { id: "c5", text: "A fast rollback path so alerts can translate into quick recovery" },
          ],
          successFeedback:
            "That's a real feedback loop: you can see production, you get told when it's unhealthy, you recover fast, and every incident makes the pipeline stronger.",
          reviewFeedback:
            "Each item closes part of the loop. Metrics without alerts go unwatched; incidents without new tests recur; without DORA tracking you can't tell whether you're improving.",
        },
      ],
    },
  ],
};
