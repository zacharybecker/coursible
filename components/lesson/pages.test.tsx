import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GradeResponse } from "@/lib/types";
import { fixtureCourse } from "@/lib/test-fixtures/course";
import { TextPageView } from "./pages/text-page";
import { DiagramPageView } from "./pages/diagram-page";
import { MultipleChoicePageView } from "./pages/multiple-choice-page";
import { MatchingPageView } from "./pages/matching-page";
import { TypingPageView, normalizeTypedAnswer } from "./pages/typing-page";
import { OpenEndedPageView } from "./pages/open-ended-page";

// Mermaid is mocked: jsdom can't lay out SVG, and the render path is what we
// exercise (success → svg injected; failure → caption fallback).
const renderMock = vi.hoisted(() => vi.fn());
vi.mock("mermaid", () => ({
  default: { initialize: vi.fn(), render: renderMock },
}));

beforeEach(() => {
  cleanup();
  renderMock.mockReset();
});

const l1 = fixtureCourse.lessons[0];
const l2 = fixtureCourse.lessons[1];
const textPage = l1.pages[0];
const diagramPage = l1.pages[1];
const mcPage = l1.pages[2];
const typingPage = l1.pages[3];
const matchingPage = l2.pages[2];
const openEndedPage = l2.pages[3];
if (textPage.type !== "text") throw new Error("fixture shape changed — update pages.test.tsx");
if (diagramPage.type !== "diagram")
  throw new Error("fixture shape changed — update pages.test.tsx");
if (mcPage.type !== "multiple_choice")
  throw new Error("fixture shape changed — update pages.test.tsx");
if (typingPage.type !== "typing") throw new Error("fixture shape changed — update pages.test.tsx");
if (matchingPage.type !== "matching")
  throw new Error("fixture shape changed — update pages.test.tsx");
if (openEndedPage.type !== "open_ended")
  throw new Error("fixture shape changed — update pages.test.tsx");

describe("TextPageView", () => {
  it("renders the body and continues", () => {
    const onContinue = vi.fn();
    render(<TextPageView page={textPage} onContinue={onContinue} />);
    expect(screen.getByText("image")).toBeInTheDocument(); // the **bold** span
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });
});

describe("DiagramPageView", () => {
  it("renders the mermaid SVG and the caption", async () => {
    renderMock.mockResolvedValue({ svg: '<svg data-testid="mmd"></svg>' });
    const onContinue = vi.fn();
    render(<DiagramPageView page={diagramPage} onContinue={onContinue} />);
    await waitFor(() => expect(screen.getByTestId("mmd")).toBeInTheDocument());
    expect(screen.getByText(diagramPage.caption)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("falls back to a caption card when mermaid fails to render", async () => {
    renderMock.mockRejectedValue(new Error("parse error"));
    render(<DiagramPageView page={diagramPage} onContinue={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/diagram could not be displayed/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(diagramPage.caption)).toBeInTheDocument();
  });
});

describe("MultipleChoicePageView", () => {
  it("completes correct on a right first pick and shows the explanation", () => {
    const onComplete = vi.fn();
    render(<MultipleChoicePageView page={mcPage} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("radio", { name: /immutable template/i }));
    expect(screen.getByText("Correct!")).toBeInTheDocument();
    expect(screen.getByText(mcPage.explanation)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("completes incorrect on a wrong pick and surfaces the misconception", () => {
    const onComplete = vi.fn();
    render(<MultipleChoicePageView page={mcPage} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("radio", { name: /running process/i }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
    expect(screen.getByText(/confuses images with containers/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });
});

describe("MatchingPageView", () => {
  it("completes correct when every pair is matched without a miss", () => {
    const onComplete = vi.fn();
    render(<MatchingPageView page={matchingPage} onComplete={onComplete} />);
    for (const pair of matchingPage.pairs) {
      fireEvent.click(screen.getByRole("button", { name: pair.left }));
      fireEvent.click(screen.getByRole("button", { name: pair.right }));
    }
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("completes incorrect after a mismatched attempt", () => {
    const onComplete = vi.fn();
    render(<MatchingPageView page={matchingPage} onComplete={onComplete} />);
    const [first, second] = matchingPage.pairs;
    // One deliberate miss: first.left with second.right.
    fireEvent.click(screen.getByRole("button", { name: first.left }));
    fireEvent.click(screen.getByRole("button", { name: second.right }));
    for (const pair of matchingPage.pairs) {
      fireEvent.click(screen.getByRole("button", { name: pair.left }));
      fireEvent.click(screen.getByRole("button", { name: pair.right }));
    }
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });
});

describe("TypingPageView", () => {
  it("normalizes answers case- and whitespace-insensitively", () => {
    expect(normalizeTypedAnswer("  A   Layer ")).toBe("a layer");
  });

  it("completes correct on a right first submission", () => {
    const onComplete = vi.fn();
    render(<TypingPageView page={typingPage} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: " LAYER " } });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    expect(screen.getByText("Correct!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("shows the hint after a miss and completes incorrect after reveal", () => {
    const onComplete = vi.fn();
    render(<TypingPageView page={typingPage} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "container" } });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    expect(screen.getByText(typingPage.hint!)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    expect(screen.getByText(typingPage.acceptableAnswers[0])).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });

  it("completes incorrect when the right answer came after a retry", () => {
    const onComplete = vi.fn();
    render(<TypingPageView page={typingPage} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "container" } });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "layer" } });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });
});

describe("OpenEndedPageView", () => {
  const renderWithGrade = (result: GradeResponse, onComplete = vi.fn()) => {
    const onGrade = vi.fn().mockResolvedValue(result);
    render(<OpenEndedPageView page={openEndedPage} onGrade={onGrade} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Push then pull." } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    return { onGrade, onComplete };
  };

  it("completes correct on a pass verdict", async () => {
    const { onGrade, onComplete } = renderWithGrade({
      ok: true,
      grade: { verdict: "pass", feedback: "Covers it.", missedKeyPoints: [] },
    });
    await waitFor(() => expect(screen.getByText("Covers it.")).toBeInTheDocument());
    expect(onGrade).toHaveBeenCalledWith("Push then pull.");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("completes incorrect on a partial verdict and reveals rubric details", async () => {
    const { onComplete } = renderWithGrade({
      ok: true,
      grade: {
        verdict: "partial",
        feedback: "Gaps.",
        missedKeyPoints: ["Push the image to a registry"],
      },
    });
    await waitFor(() => expect(screen.getByText("Gaps.")).toBeInTheDocument());
    expect(screen.getByText("Push the image to a registry")).toBeInTheDocument();
    expect(screen.getByText(openEndedPage.rubric.sampleAnswer)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });

  it("lets the learner try again on a retry verdict without completing", async () => {
    const { onComplete } = renderWithGrade({
      ok: true,
      grade: { verdict: "retry", feedback: "Say more.", missedKeyPoints: [] },
    });
    await waitFor(() => expect(screen.getByText("Say more.")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /revise my answer/i }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("falls back to self-assessment when grading is unavailable", async () => {
    const { onComplete } = renderWithGrade({ ok: false, fallback: true });
    await waitFor(() =>
      expect(screen.getByText(/grading is unavailable/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(openEndedPage.rubric.sampleAnswer)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /i covered these/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });
});
