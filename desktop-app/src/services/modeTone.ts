import type { GrammarCheckResult, ToneResult, WritingMode } from "../types";
import { calculateWritingScores } from "./scoring";

export type ModeCheckResult = GrammarCheckResult & {
  writing_mode?: string;
  tone?: string;
  resume_strength_score?: number;
  impact_score?: number;
  professionalism_score?: number;
  clinical_clarity_score?: number;
};

export function buildModeSummary(
  mode: WritingMode,
  issueCount: number,
  scores: {
    grammar?: number;
    clarity?: number;
    strength?: number;
    impact?: number;
    professionalism?: number;
    clinical?: number;
  }
): string {
  if (issueCount === 0) {
    switch (mode) {
      case "resume":
        return "No resume issues flagged — bullet looks strong.";
      case "email":
        return "Email tone looks professional — no issues flagged.";
      case "healthcare":
        return "Healthcare writing looks clear — no issues flagged.";
      case "academic":
        return "Academic tone looks formal — no major issues flagged.";
      case "business":
        return "Business writing looks professional — no issues flagged.";
      default:
        return "Great work. No major issues found — you can still improve tone or conciseness.";
    }
  }
  switch (mode) {
    case "resume":
      return `${issueCount} resume improvement${issueCount === 1 ? "" : "s"} found. Strength ${scores.strength ?? 0}%, impact ${scores.impact ?? 0}%.`;
    case "email":
      return `${issueCount} email issue${issueCount === 1 ? "" : "s"} found. Professionalism ${scores.professionalism ?? 0}%.`;
    case "healthcare":
      return `${issueCount} healthcare issue${issueCount === 1 ? "" : "s"} found. Clinical clarity ${scores.clinical ?? 0}%.`;
    case "academic":
      return `${issueCount} academic issue${issueCount === 1 ? "" : "s"} found. Formality ${scores.professionalism ?? 0}%.`;
    case "business":
      return `${issueCount} business issue${issueCount === 1 ? "" : "s"} found. Professionalism ${scores.professionalism ?? 0}%.`;
    default:
      return `${issueCount} issue${issueCount === 1 ? "" : "s"} to fix. Grammar ${scores.grammar ?? 0}%, clarity ${scores.clarity ?? 0}%.`;
  }
}

export function modeResultToTone(
  result: ModeCheckResult,
  mode: WritingMode,
  visibleIssueCount?: number,
  text = ""
): ToneResult {
  const count = visibleIssueCount ?? result.issue_count;
  const clarity = Number(result.clarity_score ?? 100);
  const grammar = Number(result.grammar_score ?? 100);
  const issues = result.issues ?? [];

  const writing_scores = calculateWritingScores(text, issues, mode, {
    grammar,
    clarity,
    professionalism: result.professionalism_score ?? grammar,
  });

  if (mode === "resume") {
    const strength = result.resume_strength_score ?? grammar;
    const impact = result.impact_score ?? Math.max(35, strength - 15);
    return {
      tone: result.tone ?? "Resume-oriented",
      clarity_score: clarity,
      grammar_score: strength,
      resume_strength_score: strength,
      impact_score: impact,
      suggestion_count: count,
      clarity_suggestions: result.clarity_suggestions ?? [],
      writing_mode: "resume",
      writing_scores: { ...writing_scores, overall: Math.round((strength + impact + clarity) / 3) },
      summary: buildModeSummary("resume", count, { strength, impact }),
    };
  }

  if (mode === "email") {
    const prof = result.professionalism_score ?? grammar;
    return {
      tone: result.tone ?? "Professional Email",
      clarity_score: clarity,
      grammar_score: prof,
      professionalism_score: prof,
      suggestion_count: count,
      clarity_suggestions: result.clarity_suggestions ?? [],
      writing_mode: "email",
      writing_scores,
      summary: buildModeSummary("email", count, { professionalism: prof }),
    };
  }

  if (mode === "healthcare") {
    const clinical = result.clinical_clarity_score ?? clarity;
    const prof = result.professionalism_score ?? Math.max(50, grammar - 5);
    return {
      tone: result.tone ?? "Professional Healthcare",
      clarity_score: clinical,
      grammar_score: grammar,
      clinical_clarity_score: clinical,
      professionalism_score: prof,
      suggestion_count: count,
      clarity_suggestions: result.clarity_suggestions ?? [],
      writing_mode: "healthcare",
      writing_scores: { ...writing_scores, clarity: clinical, professionalism: prof },
      summary: buildModeSummary("healthcare", count, { clinical, grammar }),
    };
  }

  if (mode === "academic") {
    const prof = result.professionalism_score ?? grammar;
    return {
      tone: result.tone ?? "Academic",
      clarity_score: clarity,
      grammar_score: prof,
      professionalism_score: prof,
      suggestion_count: count,
      clarity_suggestions: result.clarity_suggestions ?? [],
      writing_mode: "academic",
      writing_scores,
      summary: buildModeSummary("academic", count, { professionalism: prof }),
    };
  }

  if (mode === "business") {
    const prof = result.professionalism_score ?? grammar;
    return {
      tone: result.tone ?? "Business Professional",
      clarity_score: clarity,
      grammar_score: prof,
      professionalism_score: prof,
      suggestion_count: count,
      clarity_suggestions: result.clarity_suggestions ?? [],
      writing_mode: "business",
      writing_scores,
      summary: buildModeSummary("business", count, { professionalism: prof }),
    };
  }

  const g = count > 0 ? Math.min(grammar, 99) : grammar;
  return {
    tone: result.tone ?? "Neutral",
    clarity_score: clarity,
    grammar_score: g,
    suggestion_count: count,
    clarity_suggestions: result.clarity_suggestions ?? [],
    writing_mode: "general",
    writing_scores: { ...writing_scores, grammar: g },
    summary: buildModeSummary("general", count, { grammar: g, clarity }),
  };
}
