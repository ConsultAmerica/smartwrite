import type { Document, ToneResult, ToneMode, WritingMode } from "../types";
import { analyzeAcademicLocally } from "./academicAnalysis";
import { analyzeBusinessLocally } from "./businessAnalysis";
import { analyzeEmailLocally } from "./emailAnalysis";
import { mergeGeneralIssues } from "./generalAnalysis";
import { analyzeHealthcareLocally, looksLikeHealthcareText } from "./healthcareAnalysis";
import { analyzeResumeLocally, looksLikeWeakResumeBullet } from "./resumeAnalysis";
import { modeResultToTone, type ModeCheckResult } from "./modeTone";
import { normalizeClaritySuggestions, normalizeIssues } from "./normalize";

function resolveApiBase(): string {
  const envBase = import.meta.env.VITE_API_BASE?.trim();
  if (envBase) return envBase.replace(/\/$/, "");

  if (typeof window === "undefined") return "http://127.0.0.1:8002";
  const electronUrl = (window as Window & { smartwrite?: { apiBaseUrl: string } }).smartwrite
    ?.apiBaseUrl;
  if (electronUrl) return electronUrl;
  if (import.meta.env.DEV) return "";
  if (window.location.port === "8002" || window.location.port === "") {
    return window.location.origin;
  }
  return "http://127.0.0.1:8002";
}

const API_BASE = resolveApiBase();
const DEV_BACKEND = "http://127.0.0.1:8002";

async function request<T>(
  path: string,
  init: RequestInit & { method?: string }
): Promise<T> {
  const bases = API_BASE ? [API_BASE] : [""];
  if (import.meta.env.DEV && !API_BASE) {
    bases.push(DEV_BACKEND);
  }

  let lastError = "Request failed";
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, init);
      if (!res.ok) {
        lastError = (await res.text()) || `HTTP ${res.status}`;
        continue;
      }
      return (await res.json()) as T;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastError);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

function normalizeDocument(raw: Record<string, unknown>, fallback: { title: string; content: string }): Document {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) {
    throw new Error("Save failed: server returned an invalid document id.");
  }
  return {
    id,
    title: String(raw.title ?? fallback.title),
    content: String(raw.content ?? fallback.content),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

function mapCheckResult(raw: ModeCheckResult, text: string): ModeCheckResult {
  return {
    ...raw,
    issues: normalizeIssues(raw.issues ?? [], text),
    clarity_score: Number(raw.clarity_score ?? 100),
    clarity_suggestions: normalizeClaritySuggestions(raw.clarity_suggestions ?? []),
    issue_count: Number(raw.issue_count ?? (raw.issues as unknown[] | undefined)?.length ?? 0),
    grammar_score: Number(raw.grammar_score ?? 100),
    resume_strength_score: raw.resume_strength_score,
    impact_score: raw.impact_score,
    professionalism_score: raw.professionalism_score,
    clinical_clarity_score: raw.clinical_clarity_score,
    writing_mode: raw.writing_mode,
    tone: raw.tone,
  };
}

function isUsableModeApiResult(raw: ModeCheckResult, mode: WritingMode, text: string): boolean {
  if (raw.writing_mode === mode) return true;
  if ((raw.issue_count ?? 0) > 0) {
    if (mode === "resume") return looksLikeWeakResumeBullet(text) || raw.resume_strength_score != null;
    if (mode === "healthcare") return looksLikeHealthcareText(text) || raw.clinical_clarity_score != null;
    if (mode === "email") return raw.professionalism_score != null;
    return true;
  }
  return false;
}

function analyzeLocally(mode: WritingMode, text: string): ModeCheckResult {
  switch (mode) {
    case "resume": {
      const r = analyzeResumeLocally(text);
      return { ...r, writing_mode: "resume", tone: "Resume-oriented" };
    }
    case "email": {
      const r = analyzeEmailLocally(text);
      return {
        ...r,
        writing_mode: "email",
        tone: "Professional Email",
        professionalism_score: r.professionalism_score,
      };
    }
    case "healthcare": {
      const r = analyzeHealthcareLocally(text);
      return {
        ...r,
        writing_mode: "healthcare",
        tone: "Professional Healthcare",
        clinical_clarity_score: r.clinical_clarity_score,
        professionalism_score: r.professionalism_score,
      };
    }
    case "academic": {
      const r = analyzeAcademicLocally(text);
      return { ...r, writing_mode: "academic", tone: "Academic", professionalism_score: r.professionalism_score };
    }
    case "business": {
      const r = analyzeBusinessLocally(text);
      return { ...r, writing_mode: "business", tone: "Business Professional", professionalism_score: r.professionalism_score };
    }
    default:
      return mergeGeneralIssues(
        {
          issues: [],
          grammar_score: 100,
          issue_count: 0,
          clarity_score: 100,
          clarity_suggestions: [],
          writing_mode: "general",
          tone: "Neutral",
        } as ModeCheckResult,
        text
      );
  }
}

async function fetchModeFromApi(
  text: string,
  mode: WritingMode,
  documentId?: number | null,
  userDictionary?: string[]
): Promise<ModeCheckResult | null> {
  const body = {
    text,
    document_id: documentId ?? null,
    user_dictionary: userDictionary ?? [],
    writing_mode: mode,
  };
  const paths: Record<WritingMode, string[]> = {
    general: ["/check-grammar"],
    resume: ["/check-resume", "/check-grammar"],
    email: ["/check-email", "/check-grammar"],
    healthcare: ["/check-healthcare", "/check-grammar"],
    academic: ["/check-academic", "/check-grammar"],
    business: ["/check-business", "/check-grammar"],
  };

  for (const path of paths[mode] ?? ["/check-grammar"]) {
    try {
      return await post<ModeCheckResult>(path, body);
    } catch {
      /* try next path or fallback */
    }
  }
  return null;
}

export async function checkGrammar(
  text: string,
  documentId?: number | null,
  userDictionary?: string[],
  writingMode: WritingMode = "general"
): Promise<ModeCheckResult> {
  const raw = await fetchModeFromApi(text, writingMode, documentId, userDictionary);
  if (writingMode === "general") {
    if (raw) return mapCheckResult(mergeGeneralIssues(mapCheckResult(raw, text), text), text);
    return mapCheckResult(analyzeLocally("general", text), text);
  }
  if (raw && isUsableModeApiResult(raw, writingMode, text)) {
    return mapCheckResult(raw, text);
  }
  return mapCheckResult(analyzeLocally(writingMode, text), text);
}

export function grammarResultToTone(
  result: ModeCheckResult,
  _toneLabel = "Neutral",
  visibleIssueCount?: number,
  options?: { mode?: WritingMode; text?: string }
): ToneResult {
  const mode = options?.mode ?? (result.writing_mode as WritingMode) ?? "general";
  return modeResultToTone(result, mode, visibleIssueCount, options?.text ?? "");
}

export async function detectTone(
  text: string,
  userDictionary?: string[]
): Promise<ToneResult> {
  const raw = await post<ToneResult & { clarity_suggestions?: unknown[] }>("/detect-tone", {
    text,
    user_dictionary: userDictionary ?? [],
  });
  const issueCount = Number(raw.suggestion_count ?? 0);
  const grammarScore = issueCount > 0 ? Math.min(Number(raw.grammar_score ?? 100), 99) : 100;
  return {
    ...raw,
    grammar_score: grammarScore,
    clarity_suggestions: normalizeClaritySuggestions(raw.clarity_suggestions ?? []),
    summary:
      issueCount === 0
        ? "Writing looks clean — keep going!"
        : `${issueCount} issue${issueCount === 1 ? "" : "s"} to fix. Grammar score: ${grammarScore}%.`,
  };
}

export async function rewrite(
  text: string,
  mode: ToneMode,
  documentId?: number | null
): Promise<{ rewritten_text: string; mode: string; source: string }> {
  return post("/rewrite", { text, mode, document_id: documentId ?? null });
}

export async function improveResume(
  text: string,
  action: string = "bullet",
  documentId?: number | null
): Promise<{ rewritten_text: string }> {
  return post("/improve-resume-bullet", {
    text,
    action,
    document_id: documentId ?? null,
  });
}

export async function improveEmail(
  text: string,
  action: string,
  documentId?: number | null
): Promise<{ rewritten_text: string }> {
  return post("/improve-email", { text, action, document_id: documentId ?? null });
}

export async function improveHealthcare(
  text: string,
  action: string,
  documentId?: number | null
): Promise<{ rewritten_text: string }> {
  return post("/improve-healthcare", { text, action, document_id: documentId ?? null });
}

export async function listDocuments(): Promise<{ documents: Document[] }> {
  return get("/documents");
}

export async function seedSampleDocuments(): Promise<{ documents: Document[] }> {
  return post("/documents/seed-samples", {});
}

export async function saveDocument(
  title: string,
  content: string,
  id?: number | null
): Promise<Document> {
  const payload: { title: string; content: string; id?: number } = {
    title: title.trim() || "Untitled Document",
    content,
  };
  if (id != null && Number.isFinite(id)) {
    payload.id = id;
  }
  const raw = await post<Record<string, unknown>>("/documents", payload);
  return normalizeDocument(raw, payload);
}

export async function deleteDocument(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}

export async function healthCheck(): Promise<boolean> {
  try {
    const data = await get<{ api?: string }>("/health");
    return data.api === "backend-v1";
  } catch {
    return false;
  }
}
