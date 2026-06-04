import type { GrammarCheckResult, GrammarIssue } from "../types";

function issue(text: string, start: number, end: number, opts: {
  issueType: string; title: string; message: string; suggestion: string; why: string;
}): GrammarIssue {
  return {
    id: `biz-${opts.issueType}-${start}`,
    message: opts.message,
    short_message: opts.title,
    issue_title: opts.title,
    problem: end > start ? text.slice(start, end) : opts.message,
    suggestion: opts.suggestion,
    why: opts.why,
    offset: start,
    length: Math.max(0, end - start),
    replacements: [opts.suggestion],
    rule_id: `BUSINESS_${opts.issueType.toUpperCase()}`,
    category: "business",
    issue_type: opts.issueType,
  };
}

export function analyzeBusinessLocally(text: string): GrammarCheckResult & { professionalism_score: number } {
  const issues: GrammarIssue[] = [];
  const patterns: [RegExp, string, string][] = [
    [/\bpretty good\b/i, "highly effective", "Use confident business language."],
    [/\bcould maybe\b/i, "can", "Remove hedging in proposals."],
    [/\byou guys\b/i, "your team", "Use professional address."],
    [/\bjust wanted to reach out\b/i, "I am reaching out to discuss", "Lead with purpose."],
    [/\bwe think\b/i, "Our analysis indicates", "Support claims with evidence."],
  ];
  for (const [re, suggestion, why] of patterns) {
    const m = re.exec(text);
    if (m) {
      issues.push(issue(text, m.index, m.index + m[0].length, {
        issueType: "vague_wording",
        title: "Professionalism",
        message: "Strengthen business tone.",
        suggestion,
        why,
      }));
    }
  }
  const prof = Math.max(42, 100 - issues.length * 10);
  return {
    issues: issues.slice(0, 8),
    grammar_score: prof,
    issue_count: issues.length,
    clarity_score: Math.max(60, 92 - issues.length * 6),
    clarity_suggestions: [],
    professionalism_score: prof,
  };
}
