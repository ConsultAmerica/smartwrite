import type { GrammarCheckResult, GrammarIssue } from "../types";

const HC_TERMS =
  /\b(medicare|healthcare|follow-up|diabetes|hypertension|copd|anemia|readmissions|outpatient|chronic disease|lab values|patient records|care coordination|hospital readmissions|type 2 diabetes|clinical team|medical director|high-risk patients)\b/i;

function hcIssue(
  text: string,
  start: number,
  end: number,
  opts: { issueType: string; title: string; message: string; suggestion: string; why: string }
): GrammarIssue {
  return {
    id: `hc-${opts.issueType}-${start}`,
    message: opts.message,
    short_message: opts.title,
    issue_title: opts.title,
    problem: end > start ? text.slice(start, end) : opts.message,
    suggestion: opts.suggestion,
    why: opts.why,
    offset: start,
    length: Math.max(0, end - start),
    replacements: [opts.suggestion],
    rule_id: `HC_${opts.issueType.toUpperCase()}`,
    category: "healthcare",
    issue_type: opts.issueType,
  };
}

export function analyzeHealthcareLocally(text: string): GrammarCheckResult & {
  clinical_clarity_score: number;
  professionalism_score: number;
} {
  const issues: GrammarIssue[] = [];

  const aiPeered = /\bAI-peered\s+agent\b/i.exec(text);
  if (aiPeered) {
    issues.push(
      hcIssue(text, aiPeered.index, aiPeered.index + aiPeered[0].length, {
        issueType: "context_error",
        title: "Context Error",
        message: '"AI-peered agent" should be "AI-powered agent."',
        suggestion: "AI-powered agent",
        why: '"AI-powered" is correct for clinical technology descriptions.',
      })
    );
  }

  const notTidied = /\bnot\s+tidied\s+until\b/i.exec(text);
  if (notTidied) {
    issues.push(
      hcIssue(text, notTidied.index, notTidied.index + notTidied[0].length, {
        issueType: "context_error",
        title: "Context Error",
        message: 'Did you mean "not notified until"?',
        suggestion: "not notified until",
        why: '"Notified" fits patient outreach; "tidied" does not belong in clinical context.',
      })
    );
  }

  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  for (const sentence of sentences) {
    if (sentence.split(/\s+/).length > 32) {
      const idx = text.indexOf(sentence.slice(0, 40));
      issues.push(
        hcIssue(text, Math.max(0, idx), Math.max(0, idx) + sentence.length, {
          issueType: "long_sentence",
          title: "Clinical Clarity",
          message: "Long clinical sentence — split for readability.",
          suggestion: "Break into two sentences: context, then action.",
          why: "Long healthcare sentences slow comprehension for clinical staff.",
        })
      );
      break;
    }
  }

  const clinical = Math.max(45, 96 - issues.length * 10);
  const grammar = issues.length ? Math.min(92, 100 - issues.length * 8) : 100;
  const prof = Math.max(50, 100 - issues.length * 7);

  return {
    issues,
    grammar_score: grammar,
    issue_count: issues.length,
    clarity_score: clinical,
    clarity_suggestions: [],
    clinical_clarity_score: clinical,
    professionalism_score: prof,
  };
}

export function looksLikeHealthcareText(text: string): boolean {
  return HC_TERMS.test(text) || /\bpatient\b/i.test(text);
}
