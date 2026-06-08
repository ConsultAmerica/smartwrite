import type { AgentDefinition } from "../types";

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "clarity",
    title: "Clarity Agent",
    description: "Simplify text, reduce complexity, and improve readability.",
  },
  {
    id: "tone",
    title: "Tone Agent",
    description: "Transform tone while keeping meaning — formal, friendly, professional, and more.",
  },
  {
    id: "grader",
    title: "Grader Agent",
    description: "Score your writing 0–100 with rubric feedback across clarity, structure, grammar, and style.",
  },
  {
    id: "humanizer",
    title: "Humanizer Agent",
    description: "Make AI-generated or stiff text sound natural and conversational.",
  },
];

export const TONE_AGENT_OPTIONS = [
  "Formal",
  "Friendly",
  "Professional",
  "Assertive",
  "Empathetic",
] as const;
