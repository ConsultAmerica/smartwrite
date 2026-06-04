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

export function scoreLevelLabel(score: number): string {
  const level = scoreLevel(score);
  if (level === "excellent") return "Excellent";
  if (level === "good") return "Good";
  if (level === "fair") return "Needs improvement";
  return "Poor";
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
    Math.min(99, (base?.grammar ?? 100) - grammarIssues * 8 - issuePenalty * 0.3)
  );
  const clarity = Math.max(40, Math.min(99, (base?.clarity ?? 100) - issues.filter((i) => i.issue_type === "clarity").length * 10));
  const tone = Math.max(
    40,
    Math.min(
      99,
      (base?.tone ?? 85) -
        issues.filter((i) => ["tone_issue", "casual_wording", "blunt_wording", "informal"].includes(i.issue_type)).length * 12
    )
  );
  const avgSentence = words / Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
  const readability = Math.max(
    45,
    Math.min(99, 100 - Math.max(0, avgSentence - 18) * 3 - (words > 400 ? 5 : 0))
  );
  const professionalism = Math.max(
    40,
    Math.min(
      99,
      (base?.professionalism ?? base?.grammar ?? grammar) -
        issues.filter((i) =>
          ["blunt_wording", "casual_wording", "weak_verb", "vague_wording", "informal"].includes(i.issue_type)
        ).length * 8
    )
  );

  let overall = Math.round((grammar + clarity + tone + readability + professionalism) / 5);
  if (issues.length > 0) overall = Math.min(overall, 89);
  if (mode === "resume" && base?.grammar) {
    overall = Math.round(((base.grammar as number) + clarity + professionalism) / 3);
  }

  return {
    overall: Math.max(35, Math.min(99, overall)),
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
