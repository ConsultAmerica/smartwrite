import type { GrammarCheckResult, GrammarIssue } from "../types";

function issue(
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
    id: `email-${opts.issueType}-${start}`,
    message: opts.message,
    short_message: opts.title,
    issue_title: opts.title,
    problem: end > start ? text.slice(start, end) : opts.message,
    suggestion: opts.suggestion,
    why: opts.why,
    offset: start,
    length: Math.max(0, end - start),
    replacements: [opts.suggestion],
    rule_id: `EMAIL_${opts.issueType.toUpperCase()}`,
    category: "email",
    issue_type: opts.issueType,
  };
}

export function suggestEmailSubjects(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const subjects: string[] = [];

  if (/interview|meeting|schedule/i.test(trimmed)) {
    subjects.push("Follow-up on our interview");
    subjects.push("Checking in regarding the interview");
  }
  if (/file|document|attachment|send/i.test(trimmed)) {
    subjects.push("Request for shared document");
    subjects.push("Following up on requested file");
  }
  if (/thanks|thank you/i.test(trimmed)) {
    subjects.push("Thank you for your time");
  }
  if (/proposal|project|quote/i.test(trimmed)) {
    subjects.push("Project proposal follow-up");
    subjects.push("Next steps on our proposal");
  }

  if (subjects.length === 0) {
    const snippet = trimmed.split(/\s+/).slice(0, 6).join(" ");
    subjects.push(`Re: ${snippet}${trimmed.split(/\s+/).length > 6 ? "…" : ""}`);
    subjects.push("Quick follow-up");
    subjects.push("Professional inquiry");
  }

  return [...new Set(subjects)].slice(0, 3);
}

export function analyzeEmailLocally(text: string): GrammarCheckResult & {
  professionalism_score: number;
} {
  const issues: GrammarIssue[] = [];
  const lower = text.toLowerCase();

  const sendMe = /\bsend\s+me\b/i.exec(text);
  if (sendMe) {
    issues.push(
      issue(text, sendMe.index, sendMe.index + sendMe[0].length, {
        issueType: "blunt_wording",
        title: "Blunt Wording",
        message: "Soften direct demands for professional email.",
        suggestion: "Could you please send me the file when you get a chance?",
        why: "The revised sentence sounds more polite and professional.",
      })
    );
  }

  if (/\bhey\b/i.test(text) && !/^hello|^dear/i.test(lower)) {
    const m = /\bhey\b/i.exec(text)!;
    issues.push(
      issue(text, m.index, m.index + m[0].length, {
        issueType: "casual_wording",
        title: "Casual Wording",
        message: "Opening with “hey” can sound too informal.",
        suggestion: "Hello",
        why: "Use a professional greeting such as Hello or Dear [Name].",
      })
    );
  }

  if (/\b(lol|gonna|wanna)\b/i.test(text)) {
    const m = /\b(lol|gonna|wanna)\b/i.exec(text)!;
    issues.push(
      issue(text, m.index, m.index + m[0].length, {
        issueType: "casual_wording",
        title: "Casual Wording",
        message: "Replace casual language with professional wording.",
        suggestion: "Thank you for your time.",
        why: "Professional emails avoid slang.",
      })
    );
  }

  if (/\blet\s+me\s+know\s+when\s+you\s+can\b/i.test(text)) {
    const m = /\blet\s+me\s+know\s+when\s+you\s+can\b/i.exec(text)!;
    issues.push(
      issue(text, m.index, m.index + m[0].length, {
        issueType: "weak_cta",
        title: "Weak Call-to-Action",
        message: "Strengthen the call-to-action.",
        suggestion: "Please let me know by Friday if you are available.",
        why: "A specific, polite request improves response rates.",
      })
    );
  }

  if (text.split(/\s+/).length > 8 && !/^(dear|hello|hi|good\s)/i.test(lower)) {
    issues.push(
      issue(text, 0, 0, {
        issueType: "missing_greeting",
        title: "Missing Greeting",
        message: "Add a professional greeting.",
        suggestion: "Hello,",
        why: "Professional emails typically open with a courteous greeting.",
      })
    );
  }

  if (!/^subject:/im.test(text) && text.split(/\s+/).length > 5) {
    const suggestions = suggestEmailSubjects(text);
    issues.push(
      issue(text, 0, 0, {
        issueType: "formatting",
        title: "Subject Line",
        message: "Add a clear subject line so recipients know what the email is about.",
        suggestion: suggestions[0] ?? "Follow-up on our conversation",
        why: `Try: ${suggestions.join(" · ")}`,
      })
    );
  }

  let penalty = issues.length * 12;
  const professionalism = Math.max(42, Math.min(99, 100 - penalty));
  const clarity = Math.max(70, 100 - Math.max(0, text.split(/\s+/).length - 40));

  return {
    issues: issues.slice(0, 6),
    grammar_score: professionalism,
    issue_count: Math.min(issues.length, 6),
    clarity_score: clarity,
    clarity_suggestions: [],
    professionalism_score: professionalism,
  };
}
