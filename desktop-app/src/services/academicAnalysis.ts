import type { GrammarCheckResult, GrammarIssue } from "../types";

function issue(text: string, start: number, end: number, opts: {
  issueType: string; title: string; message: string; suggestion: string; why: string;
}): GrammarIssue {
  return {
    id: `academic-${opts.issueType}-${start}`,
    message: opts.message,
    short_message: opts.title,
    issue_title: opts.title,
    problem: end > start ? text.slice(start, end) : opts.message,
    suggestion: opts.suggestion,
    why: opts.why,
    offset: start,
    length: Math.max(0, end - start),
    replacements: [opts.suggestion],
    rule_id: `ACADEMIC_${opts.issueType.toUpperCase()}`,
    category: "academic",
    issue_type: opts.issueType,
  };
}

export function analyzeAcademicLocally(text: string): GrammarCheckResult & { professionalism_score: number } {
  const issues: GrammarIssue[] = [];
  const patterns: [RegExp, string, string][] = [
    [/\bkinda\b/i, "kind of", "Use formal phrasing in academic writing."],
    [/\bgotta\b/i, "must", "Academic tone requires formal modal verbs."],
    [/\bsuper\b/i, "highly", "Replace informal intensifiers."],
    [/\ba lot of\b/i, "numerous", "Prefer precise academic quantifiers."],
    [/\bdon't\b/i, "do not", "Avoid contractions in formal writing."],
    [/\bshow nothing\b/i, "demonstrate no significant", "Use precise academic language."],
  ];
  for (const [re, suggestion, why] of patterns) {
    const m = re.exec(text);
    if (m) {
      issues.push(issue(text, m.index, m.index + m[0].length, {
        issueType: "informal",
        title: "Informal Wording",
        message: "Replace informal language.",
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
    clarity_score: Math.max(55, 95 - issues.length * 8),
    clarity_suggestions: [],
    professionalism_score: prof,
  };
}
