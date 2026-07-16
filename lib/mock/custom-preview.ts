import type { CourseContent } from "@/lib/types";

/**
 * Canned output for the custom-course wizard's "AI preview" step.
 * The prototype returns this regardless of wizard inputs (the outcome text
 * the learner typed is displayed alongside it for flavor).
 */
export const customCoursePreview: CourseContent = {
  contentId: "content-custom-photography",
  title: "Photography: Shoot in Manual Mode",
  description:
    "A personalized path from full-auto to confident manual shooting — exposure, aperture, shutter speed, and ISO working together.",
  outcome: "Shoot a full event in manual mode with keeper-rate you're proud of",
  tags: ["Photography", "Creative", "Custom"],
  estimatedHours: 6,
  skillNodes: [
    {
      id: "ph-exposure",
      title: "Exposure Triangle",
      description: "How aperture, shutter, and ISO trade off.",
      prereqIds: [],
      lessonIds: ["ph-l1"],
      position: { col: 0, row: 1 },
    },
    {
      id: "ph-aperture",
      title: "Aperture & Depth",
      description: "Control what's in focus.",
      prereqIds: ["ph-exposure"],
      lessonIds: ["ph-l2"],
      position: { col: 1, row: 0 },
    },
    {
      id: "ph-shutter",
      title: "Shutter & Motion",
      description: "Freeze or blur movement on purpose.",
      prereqIds: ["ph-exposure"],
      lessonIds: ["ph-l3"],
      position: { col: 1, row: 2 },
    },
    {
      id: "ph-manual",
      title: "Full Manual",
      description: "Put it together in the field.",
      prereqIds: ["ph-aperture", "ph-shutter"],
      lessonIds: ["ph-l4"],
      position: { col: 2, row: 1 },
    },
  ],
  lessons: [
    {
      id: "ph-l1",
      title: "The exposure triangle",
      description: "The three dials and what they cost.",
      skillNodeId: "ph-exposure",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "ph-l1-a1",
          title: "Three ways to gather light",
          skillNodeId: "ph-exposure",
          xp: 10,
          content:
            "Every exposure balances three settings: **aperture** (how wide the lens opens), **shutter speed** (how long light hits the sensor), and **ISO** (how much the signal is amplified). Each buys you brightness at a price — aperture costs depth of field, shutter costs motion sharpness, ISO costs noise. Manual mode is just choosing which price you're willing to pay.",
          questions: [
            {
              id: "q1",
              prompt: "Your photo is too dark, but you can't slow the shutter (subjects are moving). What are your options?",
              options: [
                { id: "a", text: "Open the aperture wider or raise the ISO" },
                { id: "b", text: "Only raising ISO can brighten a photo" },
                { id: "c", text: "Nothing — the shot is impossible" },
              ],
              correctOptionId: "a",
              explanation: "Two other sides of the triangle remain: more aperture (shallower focus) or more ISO (more noise). Pick the cost that hurts this shot least.",
            },
          ],
        },
      ],
    },
    {
      id: "ph-l2",
      title: "Aperture in practice",
      description: "Portraits, landscapes, and f-stops.",
      skillNodeId: "ph-aperture",
      estimatedMinutes: 15,
      activities: [
        {
          type: "scenario_decision",
          id: "ph-l2-a1",
          title: "The group photo",
          skillNodeId: "ph-aperture",
          xp: 15,
          scenario:
            "You're shooting a group of eight people in two rows at golden hour with a 50mm lens. At f/1.8 your test shot has the front row sharp and the back row soft. What do you change?",
          choices: [
            {
              id: "a",
              text: "Stop down to around f/5.6 and compensate exposure elsewhere",
              outcome: "Both rows land inside the deeper depth of field — everyone's sharp.",
              rationale: "Two rows of faces need more depth of field than f/1.8 gives. Stopping down is the fix; shutter or ISO buys back the light.",
              correct: true,
            },
            {
              id: "b",
              text: "Keep f/1.8 and ask the back row to lean in really close",
              outcome: "Eight adults awkwardly compress into one focal plane. The photo looks exactly as strange as that sounds.",
              rationale: "Fighting geometry with posing has limits — the aperture ring is right there.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "ph-l3",
      title: "Shutter speed in practice",
      description: "Freezing action and creative blur.",
      skillNodeId: "ph-shutter",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "ph-l3-a1",
          title: "Fast enough to freeze",
          skillNodeId: "ph-shutter",
          xp: 10,
          content:
            "Rules of thumb: **1/focal-length** to avoid handshake blur (1/50s on a 50mm lens), **1/250s+** for walking people, **1/1000s+** for sports. Deliberate blur flips this — drag the shutter to 1/15s and pan with a moving subject for a sharp subject on a streaked background.",
          questions: [
            {
              id: "q1",
              prompt: "Handheld at 200mm, your shots are consistently soft at 1/60s. Most likely fix?",
              options: [
                { id: "a", text: "Raise shutter to at least ~1/200s" },
                { id: "b", text: "Lower ISO for a cleaner image" },
                { id: "c", text: "Use a narrower aperture" },
              ],
              correctOptionId: "a",
              explanation: "1/60s is far below the 1/focal-length guideline at 200mm — that softness is camera shake, and only a faster shutter (or a tripod) fixes it.",
            },
          ],
        },
      ],
    },
    {
      id: "ph-l4",
      title: "Full manual in the field",
      description: "A real shoot, start to finish.",
      skillNodeId: "ph-manual",
      estimatedMinutes: 30,
      activities: [
        {
          type: "applied_task",
          id: "ph-l4-a1",
          title: "The manual-mode field session",
          skillNodeId: "ph-manual",
          xp: 30,
          prompt: "Take your camera out for a one-hour session in full manual. Check off each shot as you get it.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "A portrait with deliberately shallow depth of field" },
            { id: "c2", text: "A scene with everything sharp front-to-back" },
            { id: "c3", text: "A moving subject frozen sharp" },
            { id: "c4", text: "A deliberate motion-blur or panning shot" },
          ],
          successFeedback: "Four shots, four different triangle trade-offs, all chosen on purpose — that's manual mode.",
          reviewFeedback: "Keep shooting until each look was achieved on purpose, not by luck. The panning shot usually takes the most attempts.",
        },
      ],
    },
  ],
};
