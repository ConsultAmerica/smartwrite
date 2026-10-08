import type { GrammarIssue } from "../types";

/** Backend may return partial issues — fill defaults so the UI never crashes. */
export function normalizeIssue(raw: Record<string, unknown>, text: string): GrammarIssue {
  const offset = Number(raw.offset ?? 0);
  const length = Number(raw.length ?? 0);
  const replacements = Array.isArray(raw.replacements)
    ? (raw.replacements as string[])
    : [];
  const problem =
    typeof raw.problem === "string" && raw.problem
      ? raw.problem
      : text.slice(offset, offset + length) || "…";
  const suggestion =
    typeof raw.suggestion === "string" && raw.suggestion
      ? raw.suggestion
      : replacements[0] ?? "";

  return {
    id: String(raw.id ?? `issue-${offset}`),
    message: String(raw.message ?? "Issue detected"),
    short_message: String(raw.short_message ?? raw.message ?? "Issue"),
    issue_title: String(raw.issue_title ?? "Grammar"),
    problem,
    suggestion,
    why: String(raw.why ?? raw.message ?? "Review this suggestion."),
    offset,
    length,
    replacements,
    rule_id: String(raw.rule_id ?? "UNKNOWN"),
    category: String(raw.category ?? "grammar"),
    issue_type: String(raw.issue_type ?? "grammar"),
  };
}

export function normalizeIssues(
  items: unknown[],
  text: string
): GrammarIssue[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => normalizeIssue(item as Record<string, unknown>, text))
    .filter((issue) => {
      if (issue.offset < 0 || issue.offset > text.length) return false;
      if (issue.length < 0 || issue.offset + issue.length > text.length) return false;
      if (issue.problem && issue.length > 0) {
        const slice = text.slice(issue.offset, issue.offset + issue.length);
        return slice === issue.problem || slice.includes(issue.problem);
      }
      return true;
    });
}

export function normalizeClaritySuggestions(items: unknown[]): import("../types").ClaritySuggestion[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw, i) => {
    const item = raw as Record<string, unknown>;
    return {
      id: String(item.id ?? `clarity-${i}`),
      title: String(item.title ?? "Clarity"),
      message: String(item.message ?? ""),
      sentence: String(item.sentence ?? ""),
      suggestion: String(item.suggestion ?? ""),
    };
  });
}
