export type WritingMode = "general" | "email" | "resume" | "healthcare";

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
  | "clarity";

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

export interface ToneResult {
  tone: string;
  clarity_score: number;
  grammar_score: number;
  suggestion_count: number;
  summary: string;
  clarity_suggestions: ClaritySuggestion[];
}

export interface Document {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AiRewritePreview {
  original: string;
  improved: string;
  label: string;
}

export type Theme = "dark" | "light";
export type SaveStatus = "saved" | "unsaved" | "saving";
