import type { WritingMode } from "../types";

export type Audience = "general" | "expert" | "knowledgeable" | "public";
export type DocumentType =
  | "general"
  | "business_email"
  | "academic_paper"
  | "resume"
  | "healthcare"
  | "business_proposal";
export type GoalTone = "neutral" | "professional" | "friendly" | "confident" | "formal";
export type Formality = "casual" | "neutral" | "formal";
export type Intent = "inform" | "persuade" | "explain" | "request";

export interface WritingGoals {
  audience: Audience;
  documentType: DocumentType;
  tone: GoalTone;
  formality: Formality;
  intent: Intent;
}

export const DEFAULT_GOALS: WritingGoals = {
  audience: "general",
  documentType: "general",
  tone: "neutral",
  formality: "neutral",
  intent: "inform",
};

export const PRESET_GOALS: Record<WritingMode, WritingGoals> = {
  general: {
    audience: "general",
    documentType: "general",
    tone: "neutral",
    formality: "neutral",
    intent: "inform",
  },
  email: {
    audience: "knowledgeable",
    documentType: "business_email",
    tone: "professional",
    formality: "neutral",
    intent: "request",
  },
  academic: {
    audience: "expert",
    documentType: "academic_paper",
    tone: "formal",
    formality: "formal",
    intent: "explain",
  },
  business: {
    audience: "knowledgeable",
    documentType: "business_proposal",
    tone: "professional",
    formality: "formal",
    intent: "persuade",
  },
  resume: {
    audience: "expert",
    documentType: "resume",
    tone: "confident",
    formality: "formal",
    intent: "persuade",
  },
  healthcare: {
    audience: "public",
    documentType: "healthcare",
    tone: "professional",
    formality: "neutral",
    intent: "inform",
  },
};

export function goalsToWritingMode(goals: WritingGoals): WritingMode {
  switch (goals.documentType) {
    case "business_email":
      return "email";
    case "academic_paper":
      return "academic";
    case "resume":
      return "resume";
    case "healthcare":
      return "healthcare";
    case "business_proposal":
      return "business";
    default:
      return "general";
  }
}

export const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "general", label: "General" },
  { value: "knowledgeable", label: "Knowledgeable" },
  { value: "expert", label: "Expert" },
  { value: "public", label: "Public" },
];

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "business_email", label: "Business email" },
  { value: "academic_paper", label: "Academic paper" },
  { value: "resume", label: "Resume" },
  { value: "healthcare", label: "Healthcare" },
  { value: "business_proposal", label: "Business proposal" },
];

export const TONE_OPTIONS: { value: GoalTone; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "confident", label: "Confident" },
  { value: "formal", label: "Formal" },
];

export const FORMALITY_OPTIONS: { value: Formality; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "neutral", label: "Neutral" },
  { value: "formal", label: "Formal" },
];

export const INTENT_OPTIONS: { value: Intent; label: string }[] = [
  { value: "inform", label: "Inform" },
  { value: "persuade", label: "Persuade" },
  { value: "explain", label: "Explain" },
  { value: "request", label: "Request" },
];

export const QUICK_PRESETS: { mode: WritingMode; label: string }[] = [
  { mode: "email", label: "Email" },
  { mode: "academic", label: "Academic" },
  { mode: "business", label: "Business" },
  { mode: "resume", label: "Resume" },
  { mode: "healthcare", label: "Healthcare" },
  { mode: "general", label: "General" },
];
