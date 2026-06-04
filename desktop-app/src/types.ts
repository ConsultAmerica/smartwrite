export type WritingMode =
  | "general"
  | "email"
  | "resume"
  | "academic"
  | "healthcare"
  | "business";

export type SidebarView = "editor" | "templates" | "history" | "settings";

export type SuggestionCategory =
  | "all"
  | "grammar"
  | "spelling"
  | "punctuation"
  | "clarity"
  | "tone"
  | "conciseness"
  | "vocabulary"
  | "formatting"
  | "professionalism";

export type ToneMode =
  | "professional"
  | "casual"
  | "academic"
  | "email"
  | "resume"
  | "shorter"
  | "clearer"
  | "friendly"
  | "formal"
  | "grammar"
  | "clarity"
  | "confident";

export interface GrammarIssue {
  id: string;
  message: string;
  short_message: string;
  issue_title: string;
  problem: string;
  suggestion: string;
  why: string;
  offset: number;
  length: number;
  replacements: string[];
  rule_id: string;
  category: string;
  issue_type: string;
}

export interface ClaritySuggestion {
  id: string;
  title: string;
  message: string;
  sentence: string;
  suggestion: string;
}

export interface GrammarCheckResult {
  issues: GrammarIssue[];
  grammar_score: number;
  issue_count: number;
  clarity_score: number;
  clarity_suggestions: ClaritySuggestion[];
  corrected_text?: string | null;
}

export interface WritingScores {
  overall: number;
  grammar: number;
  clarity: number;
  tone: number;
  readability: number;
  professionalism: number;
}

export interface ToneResult {
  tone: string;
  clarity_score: number;
  grammar_score: number;
  suggestion_count: number;
  summary: string;
  clarity_suggestions: ClaritySuggestion[];
  writing_mode?: WritingMode | string;
  resume_strength_score?: number;
  impact_score?: number;
  professionalism_score?: number;
  clinical_clarity_score?: number;
  writing_scores?: WritingScores;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  preview: string;
  content: string;
  mode: WritingMode;
  score: number;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  mode: WritingMode;
  content: string;
}

export interface AiRewritePreview {
  original: string;
  improved: string;
  label: string;
  action?: string;
  kind?: "resume" | "email" | "healthcare" | "rewrite";
}

export type Theme = "dark" | "light";
export type SaveStatus = "saved" | "unsaved" | "saving";
