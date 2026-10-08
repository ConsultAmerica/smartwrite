import type { GrammarIssue } from "../types";

/** Stable dismiss key that survives reanalysis / offset shifts. */
export function issueFingerprint(issue: Pick<GrammarIssue, "rule_id" | "problem" | "suggestion" | "issue_type">): string {
  const rule = (issue.rule_id || "").toUpperCase();
  const problem = (issue.problem || "").trim().toLowerCase();
  const suggestion = (issue.suggestion || "").trim().toLowerCase();
  const type = (issue.issue_type || "").toLowerCase();
  return `${rule}|${type}|${problem}|${suggestion}`;
}

/** Identity for deduping local + server findings (prefer first / server). */
export function issueContentKey(
  issue: Pick<GrammarIssue, "issue_type" | "problem" | "suggestion" | "offset" | "length">
): string {
  const type = (issue.issue_type || "").toLowerCase();
  const problem = (issue.problem || "").trim().toLowerCase();
  const suggestion = (issue.suggestion || "").trim().toLowerCase();
  return `${type}|${problem}|${suggestion}`;
}

export function dedupeIssues(issues: GrammarIssue[]): GrammarIssue[] {
  const seenContent = new Set<string>();
  const seenSpan = new Set<string>();
  const out: GrammarIssue[] = [];
  for (const issue of issues) {
    const contentKey = issueContentKey(issue);
    const spanKey = `${issue.offset}:${issue.length}:${contentKey}`;
    if (seenContent.has(contentKey) || seenSpan.has(spanKey)) continue;
    seenContent.add(contentKey);
    seenSpan.add(spanKey);
    out.push(issue);
  }
  return out;
}

/** Prefer exact offset match; otherwise nearest occurrence of problem near the original offset. */
export function resolveIssueRange(
  text: string,
  issue: Pick<GrammarIssue, "offset" | "length" | "problem">
): { start: number; end: number } | null {
  const start = Math.max(0, Math.min(issue.offset, text.length));
  const end = Math.max(start, Math.min(start + Math.max(0, issue.length), text.length));
  const problem = issue.problem?.trim();
  if (!problem) {
    return issue.length === 0 ? { start, end: start } : { start, end };
  }
  if (text.slice(start, end) === problem || text.slice(start, start + problem.length) === problem) {
    return { start, end: start + problem.length };
  }
  const windowStart = Math.max(0, start - 80);
  const windowEnd = Math.min(text.length, end + 80);
  const window = text.slice(windowStart, windowEnd);
  const local = window.indexOf(problem);
  if (local >= 0) {
    const found = windowStart + local;
    return { start: found, end: found + problem.length };
  }
  return null;
}
