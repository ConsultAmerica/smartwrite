import type { GrammarCheckResult, GrammarIssue } from "../types";
import { dedupeIssues } from "../utils/issueFingerprint";

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
    id: `gen-${opts.issueType}-${start}-${end}`,
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

/** Local rules that work even when the AI backend is down. */
export function detectGeneralEnhancements(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  for (const m of text.matchAll(/(\$\d+(?:\.\d{2})?)\.([a-zA-Z])\b/g)) {
    const start = m.index ?? 0;
    const bad = m[0];
    issues.push(
      makeIssue(text, start, start + bad.length, {
        issueType: "grammar",
        title: "Possible number-formatting issue",
        message: "Possible number-formatting issue.",
        suggestion: m[1],
        why: 'Currency amounts usually end after the number (e.g. "$20"), not with an extra letter.',
      })
    );
  }

  for (const m of text.matchAll(/ {2,}/g)) {
    const start = m.index ?? 0;
    if (start === 0) continue;
    issues.push(
      makeIssue(text, start, start + m[0].length, {
        issueType: "style",
        title: "Extra spaces",
        message: "Duplicate spaces detected.",
        suggestion: " ",
        why: "Use a single space between words.",
      })
    );
    if (issues.length > 12) break;
  }

  for (const m of text.matchAll(/([.!?,;:])\1+/g)) {
    const start = m.index ?? 0;
    issues.push(
      makeIssue(text, start, start + m[0].length, {
        issueType: "punctuation",
        title: "Repeated punctuation",
        message: "Repeated punctuation.",
        suggestion: m[1],
        why: "One punctuation mark is usually enough.",
      })
    );
  }

  for (const m of text.matchAll(/\s+([,.!?;:])/g)) {
    const start = m.index ?? 0;
    issues.push(
      makeIssue(text, start, start + m[0].length, {
        issueType: "punctuation",
        title: "Spacing around punctuation",
        message: "Unexpected space before punctuation.",
        suggestion: m[1],
        why: "Punctuation usually sits directly after the preceding word.",
      })
    );
  }

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

  const sentenceStart = /(?:^|[.!?]\s+)([a-z])/g;
  for (const m of text.matchAll(sentenceStart)) {
    const letterIndex = (m.index ?? 0) + m[0].length - 1;
    const letter = m[1];
    issues.push(
      makeIssue(text, letterIndex, letterIndex + 1, {
        issueType: "grammar",
        title: "Capitalization",
        message: "Sentences usually start with a capital letter.",
        suggestion: letter.toUpperCase(),
        why: "Capitalize the first letter of each sentence.",
      })
    );
    if (issues.length > 14) break;
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

  const repeated = /\b(\w+)\s+\1\b/i.exec(text);
  if (repeated) {
    issues.push(
      makeIssue(text, repeated.index, repeated.index + repeated[0].length, {
        issueType: "conciseness",
        title: "Repeated word",
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
    if (issues.length > 16) break;
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
  const deduped = dedupeIssues(merged);
  const count = deduped.length;
  const grammar = count > 0 ? Math.min(base.grammar_score, 99) : base.grammar_score;
  return { ...base, issues: deduped, issue_count: count, grammar_score: grammar };
}
