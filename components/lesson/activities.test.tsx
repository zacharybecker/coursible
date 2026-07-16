import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  AppliedTaskActivity,
  ExplanationCheckActivity,
  ScenarioDecisionActivity,
} from "@/lib/types";
import { ExplanationCheck } from "./explanation-check";
import { ScenarioDecision } from "./scenario-decision";
import { AppliedTask, evaluateCommandSubmission } from "./applied-task";

beforeEach(cleanup);

const explanationActivity: ExplanationCheckActivity = {
  type: "explanation_check",
  id: "a1",
  title: "Test",
  skillNodeId: "n1",
  xp: 10,
  content: "Containers share the **host kernel**.",
  questions: [
    {
      id: "q1",
      prompt: "What do containers share?",
      options: [
        { id: "a", text: "The host kernel" },
        { id: "b", text: "Nothing" },
      ],
      correctOptionId: "a",
      explanation: "They share the host kernel.",
    },
  ],
};

describe("ExplanationCheck", () => {
  it("completes as correct when all questions answered right first try", () => {
    const onComplete = vi.fn();
    render(<ExplanationCheck activity={explanationActivity} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /check my understanding/i }));
    fireEvent.click(screen.getByRole("radio", { name: /the host kernel/i }));
    expect(screen.getByText("Correct!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /finish check/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("routes through remediation and completes as needs_review after a miss", () => {
    const onComplete = vi.fn();
    render(<ExplanationCheck activity={explanationActivity} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /check my understanding/i }));
    fireEvent.click(screen.getByRole("radio", { name: /nothing/i }));
    expect(screen.getByText("Not quite.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /finish check/i }));
    // Remediation screen shows the missed concept before completing.
    expect(screen.getByText(/quick review before moving on/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /got it — continue/i }));
    expect(onComplete).toHaveBeenCalledWith("needs_review");
  });
});

const scenarioActivity: ScenarioDecisionActivity = {
  type: "scenario_decision",
  id: "a2",
  title: "Test",
  skillNodeId: "n1",
  xp: 15,
  scenario: "The container exits immediately.",
  choices: [
    {
      id: "a",
      text: "Check the logs",
      outcome: "You find the error.",
      rationale: "Logs first.",
      correct: true,
    },
    {
      id: "b",
      text: "Rebuild the image",
      outcome: "Same crash.",
      rationale: "Slow guess.",
      correct: false,
    },
  ],
};

describe("ScenarioDecision", () => {
  it("shows outcome and rationale, completes correct on a right first pick", () => {
    const onComplete = vi.fn();
    render(<ScenarioDecision activity={scenarioActivity} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /check the logs/i }));
    expect(screen.getByText("You find the error.")).toBeInTheDocument();
    expect(screen.getByText("Logs first.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("completes needs_review when the right answer came after a retry", () => {
    const onComplete = vi.fn();
    render(<ScenarioDecision activity={scenarioActivity} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /rebuild the image/i }));
    expect(screen.getByText("Same crash.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    fireEvent.click(screen.getByRole("button", { name: /check the logs/i }));
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(onComplete).toHaveBeenCalledWith("needs_review");
  });
});

const commandActivity: AppliedTaskActivity = {
  type: "applied_task",
  id: "a3",
  title: "Test",
  skillNodeId: "n1",
  xp: 20,
  prompt: "Run nginx detached on port 8080.",
  submissionType: "command",
  expectedPatterns: ["docker\\s+run", "-d", "8080:80", "nginx"],
  successFeedback: "Perfect.",
  reviewFeedback: "Check the flags.",
};

const checklistActivity: AppliedTaskActivity = {
  type: "applied_task",
  id: "a4",
  title: "Test",
  skillNodeId: "n1",
  xp: 20,
  prompt: "Complete the milestones.",
  submissionType: "checklist",
  checklist: [
    { id: "c1", text: "Wrote the Dockerfile" },
    { id: "c2", text: "Ran the container" },
  ],
  successFeedback: "All done.",
  reviewFeedback: "Keep going.",
};

describe("evaluateCommandSubmission", () => {
  it("passes when every pattern matches, case-insensitively", () => {
    expect(
      evaluateCommandSubmission("Docker RUN -d -p 8080:80 nginx", commandActivity.expectedPatterns),
    ).toBe(true);
  });

  it("fails when any pattern is missing", () => {
    expect(
      evaluateCommandSubmission("docker run -p 8080:80 nginx", ["docker\\s+run", "-d\\b"]),
    ).toBe(false);
  });

  it("passes trivially with no patterns", () => {
    expect(evaluateCommandSubmission("anything", undefined)).toBe(true);
  });
});

describe("AppliedTask (command)", () => {
  it("completes correct on a matching submission", () => {
    const onComplete = vi.fn();
    render(<AppliedTask activity={commandActivity} onComplete={onComplete} />);

    fireEvent.change(screen.getByRole("textbox", { name: /your answer/i }), {
      target: { value: "docker run -d -p 8080:80 nginx" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByText("Perfect.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("offers revise + needs_review continue on a non-matching submission", () => {
    const onComplete = vi.fn();
    render(<AppliedTask activity={commandActivity} onComplete={onComplete} />);

    fireEvent.change(screen.getByRole("textbox", { name: /your answer/i }), {
      target: { value: "docker ps" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByText("Check the flags.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revise/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("needs_review");
  });
});

describe("AppliedTask (checklist)", () => {
  it("completes correct only when every item is checked", () => {
    const onComplete = vi.fn();
    render(<AppliedTask activity={checklistActivity} onComplete={onComplete} />);

    fireEvent.click(screen.getByText("Wrote the Dockerfile"));
    fireEvent.click(screen.getByText("Ran the container"));
    fireEvent.click(screen.getByRole("button", { name: /all done — submit/i }));
    expect(screen.getByText("All done.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("submits as needs_review when items are unchecked", () => {
    const onComplete = vi.fn();
    render(<AppliedTask activity={checklistActivity} onComplete={onComplete} />);

    fireEvent.click(screen.getByText("Wrote the Dockerfile"));
    fireEvent.click(screen.getByRole("button", { name: /submit progress/i }));
    expect(screen.getByText("Keep going.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("needs_review");
  });
});
