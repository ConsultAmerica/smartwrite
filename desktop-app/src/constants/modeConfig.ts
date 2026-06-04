import type { WritingMode } from "../types";
import { DEMO_SAMPLE_TEXT } from "./demoText";

export interface ModeInfo {
  label: string;
  description: string;
  icon: string;
  sampleTitle: string;
  sampleText: string;
}

export const MODE_INFO: Record<WritingMode, ModeInfo> = {
  general: {
    label: "General",
    icon: "✦",
    description: "Grammar, spelling, punctuation, clarity, and word choice.",
    sampleTitle: "General writing sample",
    sampleText:
      "She go to school everyday. The team were very happy and I think it went good. This is really really important for us.",
  },
  email: {
    label: "Email",
    icon: "✉",
    description: "Professional tone, greetings, closings, and polite requests.",
    sampleTitle: "Professional email",
    sampleText:
      "hey just checking in about the interview. Send me the file. let me know when you can thanks",
  },
  resume: {
    label: "Resume",
    icon: "◆",
    description: "Strong bullets, action verbs, impact, and ATS keywords.",
    sampleTitle: "Resume bullet draft",
    sampleText:
      "Developed website project. Helped team with tasks. Used React sometimes. Responsible for fixing bugs and attending meetings.",
  },
  academic: {
    label: "Academic",
    icon: "📚",
    description: "Formal structure, clarity, and removal of informal wording.",
    sampleTitle: "Academic paragraph",
    sampleText:
      "A lot of students think the results are kinda weird and don't really show nothing important. We gotta look at this more carefully because it's super important for the paper.",
  },
  healthcare: {
    label: "Healthcare",
    icon: "⚕",
    description: "Clinical clarity, domain terms, and professional healthcare tone.",
    sampleTitle: "Medicare Clinic brief",
    sampleText: DEMO_SAMPLE_TEXT,
  },
  business: {
    label: "Business",
    icon: "◈",
    description: "Concise proposals, client messages, and confident professional tone.",
    sampleTitle: "Business proposal",
    sampleText:
      "We think our solution is pretty good and could maybe help your team. Just wanted to reach out and see if you guys are interested in talking sometime soon.",
  },
};

export const MODE_ORDER: WritingMode[] = [
  "general",
  "email",
  "resume",
  "academic",
  "healthcare",
  "business",
];

export function shouldAutoLoadSampleForMode(currentText: string, targetMode: WritingMode): boolean {
  const trimmed = currentText.trim();
  if (!trimmed) return true;
  return trimmed !== MODE_INFO[targetMode].sampleText.trim();
}

export function detectModeFromContent(text: string, title: string): WritingMode | null {
  const trimmed = text.trim();
  const lowerTitle = title.toLowerCase();
  for (const mode of MODE_ORDER) {
    const info = MODE_INFO[mode];
    if (trimmed && trimmed === info.sampleText.trim()) return mode;
    if (lowerTitle.includes(info.label.toLowerCase())) return mode;
  }
  if (lowerTitle.includes("resume")) return "resume";
  if (lowerTitle.includes("email")) return "email";
  if (lowerTitle.includes("academic") || lowerTitle.includes("essay")) return "academic";
  if (lowerTitle.includes("proposal") || lowerTitle.includes("business")) return "business";
  if (lowerTitle.includes("medicare") || lowerTitle.includes("clinic")) return "healthcare";
  return null;
}
