import type { GrammarIssue, HistoryEntry, WritingMode, WritingScores } from "../types";

const HISTORY_KEY = "smartwrite-history";
const MAX_HISTORY = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, "id" | "updated_at">): HistoryEntry {
  const items = loadHistory();
  const now = new Date().toISOString();
  const record: HistoryEntry = {
    ...entry,
    id: `hist-${Date.now()}`,
    preview: entry.content.slice(0, 80).replace(/\s+/g, " ").trim(),
    updated_at: now,
  };
  const next = [record, ...items.filter((h) => h.title !== entry.title || h.content !== entry.content)].slice(
    0,
    MAX_HISTORY
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return record;
}

export function deleteHistoryEntry(id: string): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter((h) => h.id !== id)));
}

export function scoreLevel(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "fair";
  return "poor";
}

/** Generic fallback — prefer dimension-specific helpers below. */
export function scoreLevelLabel(score: number): string {
  return correctnessLabel(score);
}

export function correctnessLabel(score: number): string {
  if (score >= 90) return "Strong";
  if (score >= 80) return "Good";
  if (score >= 70) return "Moderate";
  if (score >= 55) return "Fair";
  return "Weak";
}

export function clarityLabel(score: number): string {
  if (score >= 88) return "Clear";
  if (score >= 78) return "Good";
  if (score >= 68) return "Moderate";
  return "Unclear";
}

export function engagementLabel(score: number): string {
  if (score >= 88) return "Strong";
  if (score >= 78) return "Good";
  if (score >= 68) return "Moderate";
  if (score >= 55) return "Low";
  return "Weak";
}

export function toneDimensionLabel(
  toneName: string | undefined,
  score: number | null | undefined,
  mode: WritingMode = "general"
): string {
  const raw = (toneName ?? "").trim();
  if (raw) {
    if (/professional/i.test(raw)) return "Professional";
    if (/formal|academic/i.test(raw)) return "Formal";
    if (/friendly/i.test(raw)) return "Friendly";
    if (/confident/i.test(raw)) return "Confident";
    if (/neutral/i.test(raw)) return "Neutral";
    if (/casual|informal/i.test(raw)) return "Casual";
    if (raw.length <= 18) return raw;
  }
  if (score != null) {
    if (score >= 85) return mode === "academic" ? "Formal" : "Professional";
    if (score >= 70) return "Neutral";
    return "Casual";
  }
  if (mode === "academic") return "Formal";
  if (mode === "resume") return "Confident";
  if (mode === "email" || mode === "business") return "Professional";
  return "Neutral";
}

export function scoreDots(score: number): string {
  const filled = Math.max(1, Math.min(5, Math.round(score / 20)));
  return "●".repeat(filled) + "○".repeat(5 - filled);
}

/** Cap so perfect scores stay uncommon. */
export function clampDisplayScore(score: number, issueCount = 0): number {
  let next = Math.round(score);
  if (issueCount > 0) next = Math.min(next, 88);
  else next = Math.min(next, 96);
  return Math.max(35, next);
}

export function calculateWritingScores(
  text: string,
  issues: GrammarIssue[],
  mode: WritingMode,
  base?: Partial<WritingScores>
): WritingScores {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const issuePenalty = Math.min(issues.length * 6, 45);
  const grammarTypes = new Set(["grammar", "spelling", "punctuation", "word_choice"]);
  const grammarIssues = issues.filter((i) => grammarTypes.has(i.issue_type)).length;

  const grammar = Math.max(
    40,
    Math.min(96, (base?.grammar ?? 92) - grammarIssues * 9 - issuePenalty * 0.35)
  );
  const clarity = Math.max(
    40,
    Math.min(96, (base?.clarity ?? 88) - issues.filter((i) => i.issue_type === "clarity").length * 11)
  );
  const tone = Math.max(
    40,
    Math.min(
      94,
      (base?.tone ?? 82) -
        issues.filter((i) =>
          ["tone_issue", "casual_wording", "blunt_wording", "informal"].includes(i.issue_type)
        ).length * 12
    )
  );
  const avgSentence = words / Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
  const readability = Math.max(
    45,
    Math.min(94, 90 - Math.max(0, avgSentence - 18) * 3 - (words > 400 ? 5 : 0))
  );
  const professionalism = Math.max(
    40,
    Math.min(
      94,
      (base?.professionalism ?? base?.grammar ?? grammar) -
        issues.filter((i) =>
          ["blunt_wording", "casual_wording", "weak_verb", "vague_wording", "informal"].includes(i.issue_type)
        ).length * 8
    )
  );

  let overall = Math.round((grammar + clarity + tone + readability + professionalism) / 5);
  if (issues.length > 0) overall = Math.min(overall, 88);
  else overall = Math.min(overall, 96);
  if (mode === "resume" && base?.grammar) {
    overall = Math.round(((base.grammar as number) + clarity + professionalism) / 3);
  }

  return {
    overall: clampDisplayScore(overall, issues.length),
    grammar: Math.round(grammar),
    clarity: Math.round(clarity),
    tone: Math.round(tone),
    readability: Math.round(readability),
    professionalism: Math.round(professionalism),
  };
}

export function issueCategory(issue: GrammarIssue): string {
  const t = issue.issue_type.toLowerCase();
  const map: Record<string, string> = {
    grammar: "grammar",
    spelling: "spelling",
    punctuation: "punctuation",
    clarity: "clarity",
    word_choice: "vocabulary",
    style: "formatting",
    tone_issue: "tone",
    casual_wording: "tone",
    blunt_wording: "tone",
    informal: "tone",
    vague_wording: "clarity",
    weak_verb: "professionalism",
    missing_impact: "professionalism",
    missing_metrics: "professionalism",
    conciseness: "conciseness",
    passive_voice: "clarity",
    repeated_word: "conciseness",
    long_sentence: "clarity",
    context_error: "vocabulary",
    resume_style: "professionalism",
    ats_keyword: "vocabulary",
    missing_greeting: "formatting",
    missing_closing: "formatting",
    weak_cta: "professionalism",
    healthcare_tone: "professionalism",
    clinical_clarity: "clarity",
    risk_clarity: "clarity",
  };
  return map[t] ?? issue.category ?? "grammar";
}

/** Grammarly-style sidebar buckets for contextual suggestion filters. */
export type SuggestionBucket = "correctness" | "clarity" | "tone" | "style";

export function suggestionBucket(issue: GrammarIssue): SuggestionBucket {
  const cat = issueCategory(issue);
  if (cat === "grammar" || cat === "spelling" || cat === "punctuation") return "correctness";
  if (cat === "clarity" || cat === "conciseness") return "clarity";
  if (cat === "tone") return "tone";
  return "style";
}

export function downloadTextFile(filename: string, content: string, mime = "text/plain"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadDocxSimple(filename: string, content: string): void {
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body><p>${content.replace(/\n/g, "</p><p>")}</p></body></html>`;
  downloadTextFile(filename.replace(/\.docx?$/, ".doc"), html, "application/msword");
}
