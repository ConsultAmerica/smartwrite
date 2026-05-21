import type { WritingMode } from "../types";
import { DEMO_SAMPLE_TEXT } from "./demoText";

export interface ModeInfo {
  label: string;
  description: string;
  sampleTitle: string;
  sampleText: string;
}

export const MODE_INFO: Record<WritingMode, ModeInfo> = {
  general: {
    label: "General",
    description: "Everyday writing — grammar, clarity, tone, and length.",
    sampleTitle: "General writing sample",
    sampleText:
      "The biggest improving now is making the suggestions actionable. Users should be able to click Apply, instantly replace the text, and see the grammar score improve.",
  },
  email: {
    label: "Email",
    description: "Polish professional emails — polite, concise, and follow-ups.",
    sampleTitle: "Professional email",
    sampleText:
      "hey just checking in about the interview. let me know when you can thanks. i am very interested in the role and hope to hear back soon",
  },
  resume: {
    label: "Resume",
    description: "Strong resume bullets with action verbs and measurable impact.",
    sampleTitle: "Resume bullet draft",
    sampleText:
      "Worked on website project. Helped team with tasks. Used React sometimes. Responsible for fixing bugs and attending meetings.",
  },
  healthcare: {
    label: "Healthcare",
    description: "Clinical and business healthcare writing with domain-aware checks.",
    sampleTitle: "Medicare Clinic brief",
    sampleText: DEMO_SAMPLE_TEXT,
  },
};

/** Load sample when switching modes unless the editor already shows that mode's demo. */
export function shouldAutoLoadSampleForMode(currentText: string, targetMode: WritingMode): boolean {
  const trimmed = currentText.trim();
  if (!trimmed) return true;
  return trimmed !== MODE_INFO[targetMode].sampleText.trim();
}

export function detectModeFromContent(text: string, title: string): WritingMode | null {
  const trimmed = text.trim();
  const lowerTitle = title.toLowerCase();
  for (const [mode, info] of Object.entries(MODE_INFO) as [WritingMode, ModeInfo][]) {
    if (trimmed && trimmed === info.sampleText.trim()) return mode;
    if (lowerTitle.includes(info.label.toLowerCase())) return mode;
  }
  if (lowerTitle.includes("resume")) return "resume";
  if (lowerTitle.includes("email")) return "email";
  if (lowerTitle.includes("medicare") || lowerTitle.includes("clinic")) return "healthcare";
  return null;
}
