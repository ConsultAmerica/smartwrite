import type { GrammarCheckResult, GrammarIssue } from "../types";

const CATEGORIES: Record<string, string> = {
  weak_verb: "Weak Verb",
  vague_wording: "Vague Wording",
  missing_impact: "Missing Impact",
  missing_metrics: "Missing Metrics",
  ats_keyword: "ATS Keyword Opportunity",
  resume_style: "Resume Style",
};

function makeIssue(
  text: string,
  opts: {
    idSuffix: string;
    start: number;
    end: number;
    message: string;
    problem: string;
    suggestion: string;
    why: string;
    issueType: string;
    replacements?: string[];
  }
): GrammarIssue {
  const title = CATEGORIES[opts.issueType] ?? "Resume Style";
  const phrase = opts.end > opts.start ? text.slice(opts.start, opts.end) : opts.problem;
  const reps = opts.replacements ?? (opts.suggestion ? [opts.suggestion] : []);
  return {
    id: `resume-${opts.issueType}-${opts.idSuffix}-${opts.start}`,
    message: opts.message,
    short_message: title,
    issue_title: title,
    problem: phrase || opts.problem,
    suggestion: opts.suggestion,
    why: opts.why,
    offset: opts.start,
    length: Math.max(0, opts.end - opts.start),
    replacements: reps,
    rule_id: `RESUME_${opts.issueType.toUpperCase()}`,
    category: "resume",
    issue_type: opts.issueType,
  };
}

function hasMetrics(text: string): boolean {
  if (/\d+\s*%|\$\d+|\d+\+|\d{2,}/.test(text)) return true;
  return /\b\d+\s*(users|customers|clients|projects|features|bugs|releases|weeks|months|years)\b/i.test(
    text
  );
}

function hasImpactLanguage(text: string): boolean {
  return /\b(improved|increased|reduced|delivered|achieved|grew|saved|accelerated|optimized|streamlined|boosted|enhanced|outcomes?|results?|roi|revenue)\b/i.test(
    text
  );
}

function detectResumeIssues(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  const lower = text.toLowerCase();

  const patterns: [RegExp, string, string, string, string][] = [
    [
      /\bhelped\s+(?:the\s+)?team\s+with\s+tasks\b/i,
      "vague_wording",
      "Replace vague task language with specific contributions.",
      "Collaborated with cross-functional team members to deliver sprint goals and unblock dependencies",
      "Recruiters want concrete work — not generic “helped with tasks.”",
    ],
    [
      /\bused\s+[\w.#+]+\s+sometimes\b/i,
      "vague_wording",
      "Remove hedging (“sometimes”) and state how you used the tool.",
      "Built and maintained production features using React, TypeScript, and component-driven UI patterns",
      "Hedging weakens credibility. State consistent, professional usage.",
    ],
    [
      /\bresponsible\s+for\b/i,
      "weak_verb",
      "Lead with a strong action verb instead of “Responsible for.”",
      "Resolved UI defects and participated in agile ceremonies to align delivery priorities",
      "“Responsible for” is passive. Start bullets with verbs like Developed, Led, or Delivered.",
    ],
    [
      /\b(?:developed|built|created)\s+(?:a\s+)?website\s+project\b/i,
      "vague_wording",
      "Specify what you built and the outcome.",
      "Developed and maintained a responsive React web application with reusable components",
      "“Website project” is too vague — name the stack, scope, and result.",
    ],
    [
      /\bworked\s+on\b/i,
      "weak_verb",
      "Use a stronger action verb than “Worked on.”",
      "Developed",
      "Resume bullets should start with strong action verbs (Developed, Led, Built).",
    ],
    [
      /\battending\s+meetings\b/i,
      "resume_style",
      "Meetings alone are not an achievement — tie them to delivery outcomes.",
      "collaborated during sprint planning and retrospectives to improve release quality",
      "Listing meetings without impact reads as filler on a resume.",
    ],
    [
      /\bfixing\s+bugs\b/i,
      "missing_impact",
      "Show impact of quality work, not only the activity.",
      "resolved UI and integration defects, improving release stability and user experience",
      "Bug fixing is valid — pair it with scope, tools, or measurable quality gains.",
    ],
  ];

  for (const [re, issueType, message, suggestion, why] of patterns) {
    let m: RegExpExecArray | null;
    const rx = new RegExp(re.source, re.flags);
    while ((m = rx.exec(text)) !== null) {
      issues.push(
        makeIssue(text, {
          idSuffix: m[0].slice(0, 12),
          start: m.index,
          end: m.index + m[0].length,
          message,
          problem: m[0],
          suggestion,
          why,
          issueType,
        })
      );
    }
  }

  if (/\breact\b/i.test(lower) && !/\b(?:typescript|javascript|node\.?js|frontend|component|redux|next\.?js)\b/i.test(lower)) {
    issues.push(
      makeIssue(text, {
        idSuffix: "ats-react",
        start: 0,
        end: 0,
        message: "Add ATS-friendly tech keywords alongside React.",
        problem: "React mentioned without related stack keywords",
        suggestion: "React, TypeScript, JavaScript, HTML/CSS, responsive UI, component architecture",
        why: "Applicant tracking systems scan for skill clusters — list related tools you actually used.",
        issueType: "ats_keyword",
        replacements: [
          "React, TypeScript, and modern frontend tooling",
          "React, JavaScript, HTML/CSS, and reusable components",
        ],
      })
    );
  }

  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = `${i.offset}:${i.issue_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resumeStrengthScore(issues: GrammarIssue[]): number {
  let penalty = 0;
  for (const i of issues) {
    if (i.issue_type === "weak_verb") penalty += 11;
    else if (i.issue_type === "vague_wording") penalty += 10;
    else if (i.issue_type === "resume_style") penalty += 10;
    else if (i.issue_type === "ats_keyword") penalty += 6;
    else penalty += 8;
  }
  return Math.max(38, Math.min(99, 100 - penalty));
}

function impactScore(issues: GrammarIssue[], text: string): number {
  let penalty = 0;
  for (const i of issues) {
    if (i.issue_type === "missing_metrics") penalty += 28;
    else if (i.issue_type === "missing_impact") penalty += 22;
    else if (i.issue_type === "vague_wording" || i.issue_type === "weak_verb") penalty += 8;
    else penalty += 5;
  }
  if (!hasMetrics(text)) penalty += 10;
  if (!hasImpactLanguage(text)) penalty += 12;
  return Math.max(35, Math.min(99, 100 - penalty));
}

function clarityScoreResume(text: string): number {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  if (!sentences.length) return 100;
  const avg = sentences.reduce((n, s) => n + s.split(/\s+/).length, 0) / sentences.length;
  if (avg > 28) return 78;
  if (avg > 22) return 88;
  return 96;
}

/** Client-side resume analysis (works when backend is outdated or offline). */
export function analyzeResumeLocally(
  text: string
): GrammarCheckResult & { resume_strength_score: number; impact_score: number } {
  if (!text.trim()) {
    return {
      issues: [],
      grammar_score: 100,
      issue_count: 0,
      clarity_score: 100,
      clarity_suggestions: [],
      resume_strength_score: 100,
      impact_score: 100,
    };
  }

  const priority: Record<string, number> = {
    vague_wording: 0,
    weak_verb: 1,
    missing_impact: 2,
    resume_style: 3,
    ats_keyword: 4,
    missing_metrics: 5,
  };

  let issues = detectResumeIssues(text);
  issues.sort(
    (a, b) =>
      (priority[a.issue_type] ?? 9) - (priority[b.issue_type] ?? 9) || a.offset - b.offset
  );
  const phraseLevel = issues.filter((i) => i.length > 0);
  const docLevel = issues.filter((i) => i.length === 0);
  issues = phraseLevel.slice(0, 4);
  if (issues.length < 4 && docLevel.length) {
    issues = issues.concat(docLevel.slice(0, 4 - issues.length));
  }

  const strength = resumeStrengthScore(issues);
  const impact = impactScore(issues, text);
  const clarity = clarityScoreResume(text);

  return {
    issues,
    grammar_score: strength,
    issue_count: issues.length,
    clarity_score: clarity,
    clarity_suggestions: [],
    resume_strength_score: strength,
    impact_score: impact,
  };
}

export function looksLikeWeakResumeBullet(text: string): boolean {
  return /\b(helped\s+(?:the\s+)?team|responsible\s+for|sometimes|website\s+project|worked\s+on|fixing\s+bugs|attending\s+meetings)\b/i.test(
    text
  );
}
