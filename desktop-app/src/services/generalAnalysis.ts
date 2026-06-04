import type { GrammarCheckResult, GrammarIssue } from "../types";

function makeIssue(
  text: string,
  start: number,
  end: number,
  opts: {
    issueType: string;
    title: string;
    message: string;
    suggestion: string;
    why: string;
  }
): GrammarIssue {
  return {
    id: `gen-${opts.issueType}-${start}`,
    message: opts.message,
    short_message: opts.title,
    issue_title: opts.title,
    problem: end > start ? text.slice(start, end) : opts.message,
    suggestion: opts.suggestion,
    why: opts.why,
    offset: start,
    length: Math.max(0, end - start),
    replacements: [opts.suggestion],
    rule_id: `GEN_${opts.issueType.toUpperCase()}`,
    category: opts.issueType,
    issue_type: opts.issueType,
  };
}

export function detectGeneralEnhancements(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  const sheGo = /\b(she|he|it)\s+go\b/i.exec(text);
  if (sheGo) {
    issues.push(
      makeIssue(text, sheGo.index, sheGo.index + sheGo[0].length, {
        issueType: "grammar",
        title: "Grammar",
        message: "Subject-verb agreement error.",
        suggestion: sheGo[0].replace(/\bgo\b/i, "goes"),
        why: "The verb should agree with the subject (she/he/it → goes).",
      })
    );
  }

  const everyday = /\beveryday\b/i.exec(text);
  if (everyday && /\b(school|work|life|use)\b/i.test(text)) {
    issues.push(
      makeIssue(text, everyday.index, everyday.index + everyday[0].length, {
        issueType: "grammar",
        title: "Grammar",
        message: "Use two words for “every day” when meaning “each day.”",
        suggestion: "every day",
        why: "“Every day” is an adverb phrase; “everyday” is an adjective.",
      })
    );
  }

  const passive = /\b(was|were|is|are|been|being)\s+\w+ed\b/i.exec(text);
  if (passive) {
    issues.push(
      makeIssue(text, passive.index, passive.index + passive[0].length, {
        issueType: "clarity",
        title: "Clarity",
        message: "Consider active voice for stronger writing.",
        suggestion: "Rewrite using an active verb (e.g., “The team completed…”).",
        why: "Active voice is often clearer and more direct than passive voice.",
      })
    );
  }

  const repeated = /\b(\w+)\s+\1\b/i.exec(text);
  if (repeated) {
    issues.push(
      makeIssue(text, repeated.index, repeated.index + repeated[0].length, {
        issueType: "conciseness",
        title: "Conciseness",
        message: "Repeated word detected.",
        suggestion: repeated[1],
        why: "Remove duplicate words to improve flow and readability.",
      })
    );
  }

  for (const m of text.matchAll(/\b(really|very|just|kinda|gonna|gotta|super|stuff|things)\b/gi)) {
    issues.push(
      makeIssue(text, m.index!, m.index! + m[0].length, {
        issueType: "vocabulary",
        title: "Vocabulary",
        message: "Informal or weak wording — consider a stronger alternative.",
        suggestion: "Use precise, professional vocabulary.",
        why: "Specific words improve clarity and credibility.",
      })
    );
    if (issues.length > 8) break;
  }

  return issues;
}

export function mergeGeneralIssues(
  base: GrammarCheckResult,
  text: string
): GrammarCheckResult {
  const extra = detectGeneralEnhancements(text);
  const seen = new Set(base.issues.map((i) => `${i.offset}:${i.issue_type}`));
  const merged = [...base.issues];
  for (const e of extra) {
    const key = `${e.offset}:${e.issue_type}`;
    if (!seen.has(key)) {
      merged.push(e);
      seen.add(key);
    }
  }
  const count = merged.length;
  const grammar = count > 0 ? Math.min(base.grammar_score, 99) : base.grammar_score;
  return { ...base, issues: merged, issue_count: count, grammar_score: grammar };
}
