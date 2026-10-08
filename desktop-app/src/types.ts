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
  local_id?: string;
  favorite?: boolean;
  trashed?: boolean;
  trashed_at?: string;
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

export type TemplateCategory = "email" | "academic" | "business" | "career" | "healthcare" | "general";

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  mode: WritingMode;
  content: string;
  category: TemplateCategory;
  image: string;
  featured?: boolean;
  previewLabel?: string;
}

export interface AiRewritePreview {
  original: string;
  improved: string;
  label: string;
  action?: string;
  kind?: "resume" | "email" | "healthcare" | "rewrite";
}

export type Theme = "dark" | "light";
export type SaveStatus =
  | "saved"
  | "unsaved"
  | "saving"
  | "offline"
  | "error"
  | "retrying";

export interface DocumentMeta {
  favorite?: boolean;
  trashed?: boolean;
  trashed_at?: string;
  /** Stable fingerprints of dismissed suggestions for this document. */
  dismissed?: string[];
  goals?: {
    audience?: string;
    documentType?: string;
    tone?: string;
    formality?: string;
    intent?: string;
  };
  writing_mode?: string;
}

export type AgentType = "clarity" | "tone" | "grader" | "humanizer";

export interface AgentResponse {
  agent: AgentType;
  result: AgentResultPayload;
  source: "openai" | "ollama" | "fallback" | string;
}

export interface AgentResultPayload {
  rewrite?: string;
  explanation?: string[];
  tone?: string;
  notes?: string[];
  score?: number;
  rubric?: {
    clarity?: string;
    structure?: string;
    grammar?: string;
    style?: string;
  };
  suggestions?: string[];
  changes?: string[];
}

export interface AgentDefinition {
  id: AgentType;
  title: string;
  description: string;
}
