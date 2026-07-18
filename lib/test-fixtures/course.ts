// A compact, valid schema-v2 course exercising every rendered page type and
// the cross-node teach-before-test path (l2 tests concepts taught in n1,
// which is a prereq of n2). Tests deep-clone and mutate it to produce
// invalid variants.

import type { CourseContent } from "@/lib/types";

export const fixtureCourse: CourseContent = {
  contentId: "content-fixture",
  schemaVersion: 2,
  title: "Fixture Course",
  description: "A tiny course used by tests.",
  outcome: "Exercise every page type and pedagogy rule.",
  tags: ["testing"],
  estimatedHours: 1,
  concepts: [
    { id: "c-image", name: "Container images" },
    { id: "c-layer", name: "Image layers" },
    { id: "c-registry", name: "Registries" },
  ],
  skillNodes: [
    {
      id: "n1",
      title: "Images",
      description: "Image basics",
      prereqIds: [],
      lessonIds: ["l1"],
      position: { col: 0, row: 0 },
    },
    {
      id: "n2",
      title: "Registries",
      description: "Sharing images",
      prereqIds: ["n1"],
      lessonIds: ["l2"],
      position: { col: 1, row: 0 },
    },
  ],
  lessons: [
    {
      id: "l1",
      title: "Image basics",
      description: "What images are",
      skillNodeId: "n1",
      estimatedMinutes: 10,
      pages: [
        {
          type: "text",
          id: "l1-p1",
          title: "What is an image?",
          body: "An **image** is a template.\n\nIt is built from a `Dockerfile`.",
          teaches: ["c-image"],
        },
        {
          type: "diagram",
          id: "l1-p2",
          title: "Layers",
          intro: "Images stack layers.",
          mermaid: "flowchart TD\n  A[Base layer] --> B[App layer]",
          caption: "Each build instruction adds a layer.",
          teaches: ["c-layer"],
        },
        {
          type: "multiple_choice",
          id: "l1-p3",
          prompt: "What is a container image?",
          tests: ["c-image"],
          explanation: "An image is an immutable template.",
          xp: 10,
          options: [
            { id: "o1", text: "An immutable template for containers" },
            { id: "o2", text: "A running process", misconception: "Confuses images with containers" },
            { id: "o3", text: "A virtual machine snapshot", misconception: "Confuses containers with VMs" },
          ],
          correctOptionId: "o1",
        },
        {
          type: "typing",
          id: "l1-p4",
          prompt: "What is each step of an image build called?",
          tests: ["c-layer"],
          explanation: "Each build step adds a layer.",
          xp: 10,
          acceptableAnswers: ["layer", "a layer"],
          hint: "Images are stacked from these.",
        },
      ],
    },
    {
      id: "l2",
      title: "Registries",
      description: "Sharing images",
      skillNodeId: "n2",
      estimatedMinutes: 10,
      pages: [
        {
          type: "text",
          id: "l2-p1",
          title: "Registries",
          body: "A **registry** stores and distributes images.",
          teaches: ["c-registry"],
        },
        {
          type: "text",
          id: "l2-p2",
          title: "Recap",
          body: "Push images up, pull them down.",
          teaches: [],
        },
        {
          type: "matching",
          id: "l2-p3",
          prompt: "Match each term to its role.",
          tests: ["c-image", "c-layer", "c-registry"],
          explanation: "Images are stacked from layers and live in registries.",
          xp: 15,
          pairs: [
            { id: "m1", left: "Image", right: "Immutable template" },
            { id: "m2", left: "Registry", right: "Stores images" },
            { id: "m3", left: "Layer", right: "One build step" },
          ],
        },
        {
          type: "open_ended",
          id: "l2-p4",
          prompt: "Explain how a teammate gets your image onto their machine.",
          tests: ["c-registry"],
          explanation: "See the sample answer.",
          xp: 20,
          rubric: {
            keyPoints: [
              "Push the image to a registry",
              "The teammate pulls it from the registry by name and tag",
            ],
            commonMisconceptions: [
              "Emailing the Dockerfile is the same as sharing the built image",
            ],
            sampleAnswer:
              "Push the image to a shared registry; the teammate pulls it by name and tag.",
          },
        },
      ],
    },
  ],
};
