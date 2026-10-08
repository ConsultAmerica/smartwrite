import { useCallback, useEffect, useRef, useState } from "react";
import InsightsPanel from "./components/InsightsPanel";
import DocumentsSidebar, { type SidebarNav } from "./components/DocumentsSidebar";
import AiRewriteDrawer from "./components/AiRewriteDrawer";
import TopBar from "./components/TopBar";
import EmptyState from "./components/EmptyState";
import HomeDashboard from "./components/HomeDashboard";
import DocumentsPage from "./components/DocumentsPage";
import TemplatesPage from "./components/TemplatesPage";
import ServiceNotice from "./components/ServiceNotice";
import RewriteErrorDialog from "./components/RewriteErrorDialog";
import ConfirmDialog from "./components/ConfirmDialog";
import Toast from "./components/Toast";
import Editor, { type EditorHandle } from "./components/Editor";
import { useToast } from "./hooks/useToast";
import { useUndoRedo } from "./hooks/useUndoRedo";
import * as api from "./services/api";
import type { ServiceStatus } from "./services/api";
import { userFacingRewriteError } from "./services/rewriteErrors";
import { trackMetric } from "./services/telemetry";
import {
  applyMetaToDocuments,
  clearDocumentMeta,
  getDocumentMeta,
  patchDocumentMeta,
} from "./services/documentMeta";
import {
  dedupeIssues,
  issueFingerprint,
  resolveIssueRange,
} from "./utils/issueFingerprint";
import {
  restoreRecoveryIfNewer,
  scopesMatch,
  writeRecoverySnapshot,
  type RewriteScope,
} from "./services/documentSession";
import { createAsyncOpMeta } from "./services/asyncOp";
import { detectGeneralEnhancements } from "./services/generalAnalysis";
import {
  noteOfflineFallback,
  notePossibleUndo,
  noteRewriteInserted,
  noteRewriteReplaced,
  noteSuggestionAccepted,
  noteSuggestionDismissed,
  noteSuggestionShown,
  noteTextChangedAfterAccept,
  hashDocumentKey,
  trackBetaEvent,
  trackBetaFromMeta,
  wordCountBucket,
} from "./services/betaAnalytics";
import {
  addToUserDictionary,
  isIssueDictionarySuppressed,
  loadUserDictionary,
} from "./services/dictionary";
import PanelErrorBoundary from "./components/PanelErrorBoundary";
import HelpfulnessPrompt from "./components/HelpfulnessPrompt";
import { getTextStats } from "./utils/textStats";
import type {
  AiRewritePreview,
  Document,
  GrammarIssue,
  HistoryEntry,
  SaveStatus,
  ToneMode,
  ToneResult,
  WritingMode,
} from "./types";
import { DOCUMENT_TEMPLATES, getTemplate, goalsForTemplate } from "./constants/templates";
import {
  DEFAULT_GOALS,
  PRESET_GOALS,
  type WritingGoals,
} from "./constants/writingGoals";
import { buildModeSummary } from "./services/modeTone";
import {
  cleanupJunkDraftTitles,
  confirmServerRevision,
  deleteLocalDraft,
  getLocalDraft,
  localDraftsAsDocuments,
  saveLocalDraft,
} from "./services/draftStorage";
import { loadHistory, saveHistoryEntry } from "./services/scoring";
import { sanitizeDocumentTitle } from "./utils/title";
import "./App.css";

const EMPTY_STARTERS = [
  { id: "professional-email", label: "Email" },
  { id: "academic-paragraph", label: "Essay" },
  { id: "business-proposal", label: "Proposal" },
  { id: "resume-summary", label: "Resume" },
];

const DEMO_INLINE_TEXT =
  "We was planning to submit the report tomorrow. Due to the fact that the project was delayed, the team were unsure about next steps.";

/** Instant underlines for the Start writing demo (API may refine later). */
const DEMO_INLINE_ISSUES: GrammarIssue[] = [
  {
    id: "demo-grammar-was",
    message: 'The subject "We" requires the plural verb "were".',
    short_message: "Subject-verb agreement",
    issue_title: "Subject-verb agreement",
    problem: "We was",
    suggestion: "We were",
    why: "Plural subjects take plural verbs.",
    offset: 0,
    length: 6,
    replacements: ["We were"],
    rule_id: "DEMO_SVA",
    category: "grammar",
    issue_type: "grammar",
  },
  {
    id: "demo-clarity-due",
    message: "This phrase is wordy. Prefer a concise alternative.",
    short_message: "Make this more concise",
    issue_title: "Make this sentence more concise",
    problem: "Due to the fact that",
    suggestion: "Because",
    why: "Shorter phrasing improves clarity.",
    offset: 47,
    length: 20,
    replacements: ["Because"],
    rule_id: "DEMO_CLARITY",
    category: "clarity",
    issue_type: "clarity",
  },
];

const DEMO_INLINE_TONE: ToneResult = {
  tone: "Neutral",
  summary: "A few correctness and clarity fixes would strengthen this draft.",
  grammar_score: 82,
  clarity_score: 76,
  professionalism_score: 84,
  suggestion_count: DEMO_INLINE_ISSUES.length,
  writing_scores: {
    overall: 88,
    grammar: 82,
    clarity: 76,
    tone: 80,
    readability: 78,
    professionalism: 84,
  },
  clarity_suggestions: [],
};

function applyReplacement(text: string, issue: GrammarIssue, replacement: string): string {
  const range = resolveIssueRange(text, issue);
  if (!range) return text;
  return text.slice(0, range.start) + replacement + text.slice(range.end);
}

function replaceSelection(text: string, start: number, end: number, replacement: string): string {
  return text.slice(0, start) + replacement + text.slice(end);
}

const INITIAL_TEXT = "";

export default function App() {
  const editorRef = useRef<EditorHandle>(null);
  const textRef = useRef(INITIAL_TEXT);
  const hasUnsavedChangesRef = useRef(false);
  const grammarRequestId = useRef(0);
  const toneRequestId = useRef(0);
  const didInitialCheck = useRef(false);
  const writingModeRef = useRef<WritingMode>("general");

  const {
    value: text,
    setValue: pushText,
    undo,
    redo,
    reset: resetText,
    canUndo,
    canRedo,
  } = useUndoRedo(INITIAL_TEXT);
  const setText = useCallback(
    (next: string) => {
      pushText(next);
      textRef.current = next;
      hasUnsavedChangesRef.current = true;
      contentRevisionRef.current += 1;
    },
    [pushText]
  );
  const [writingMode, setWritingMode] = useState<WritingMode>("general");
  writingModeRef.current = writingMode;
  const [writingGoals, setWritingGoals] = useState<WritingGoals>(DEFAULT_GOALS);
  const [documents, setDocuments] = useState<Document[]>(() => {
    cleanupJunkDraftTitles();
    return localDraftsAsDocuments();
  });
  const [workspaceView, setWorkspaceView] = useState<"home" | "documents" | "templates" | "editor">(
    "home"
  );
  const [sidebarNav, setSidebarNav] = useState<SidebarNav>("home");
  const [documentsCollapsed, setDocumentsCollapsed] = useState(false);
  const [mobileDocumentsOpen, setMobileDocumentsOpen] = useState(false);
  const insightsCollapsed = false;
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"suggestions" | "insights" | null>(null);
  const [focusAgentsTab, setFocusAgentsTab] = useState(false);
  const [paragraphPreview, setParagraphPreview] = useState<AiRewritePreview | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [ignoredFingerprints, setIgnoredFingerprints] = useState<Set<string>>(new Set());
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);
  const [tone, setTone] = useState<ToneResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [toneRefreshing, setToneRefreshing] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<AiRewritePreview | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>("checking");
  const [rewriteError, setRewriteError] = useState<{
    title: string;
    message: string;
    retry: () => void;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const backendOnline = serviceStatus === "online" || serviceStatus === "degraded";
  const rewriteAbortRef = useRef<AbortController | null>(null);
  const grammarAbortRef = useRef<AbortController | null>(null);
  const rewriteScopeRef = useRef<RewriteScope | null>(null);
  const staleRewriteRef = useRef<{ improved: string; label: string } | null>(null);
  const contentRevisionRef = useRef(0);
  const editorSessionKeyRef = useRef(0);
  const MAX_REWRITE_CHARS = 8000;
  const [docId, setDocId] = useState<number | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  const [docTitle, setDocTitle] = useState("Untitled");
  const [localDraftId, setLocalDraftId] = useState(() => `local-${Date.now()}`);
  const localDraftIdRef = useRef(localDraftId);
  const docTitleRef = useRef(docTitle);
  const docIdRef = useRef(docId);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("unsaved");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [previewRange, setPreviewRange] = useState<{ start: number; end: number } | null>(null);
  const [userDictionary, setUserDictionary] = useState<string[]>(() => loadUserDictionary());
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorSessionKey, setEditorSessionKey] = useState(0);
  const [feedbackKey, setFeedbackKey] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<"rewrite" | "suggestion">("rewrite");
  const lastRewriteModeRef = useRef<string>("professional");
  const { messages: toasts, showToast, dismissToast } = useToast();

  textRef.current = text;
  localDraftIdRef.current = localDraftId;
  docTitleRef.current = docTitle;
  docIdRef.current = docId;
  editorSessionKeyRef.current = editorSessionKey;

  const markUnsaved = useCallback(() => {
    hasUnsavedChangesRef.current = true;
    setSaveStatus("unsaved");
  }, []);

  const flushPendingSave = useCallback(() => {
    if (!hasUnsavedChangesRef.current) return;
    const localId = localDraftIdRef.current;
    const revision = contentRevisionRef.current;
    const meta = createAsyncOpMeta(localId, revision);
    try {
      const draft = saveLocalDraft(
        docTitleRef.current,
        textRef.current,
        docIdRef.current,
        localId,
        revision
      );
      // Ignore if this flush targeted a document that is no longer active
      if (localId !== localDraftIdRef.current) {
        trackBetaFromMeta("stale_save_dropped", meta, { errorCode: "document_switch" });
        return;
      }
      if (meta.clientRevision < contentRevisionRef.current) {
        trackBetaFromMeta("stale_save_dropped", meta, { errorCode: "newer_revision" });
        return;
      }
      setLocalDraftId(draft.id);
      localDraftIdRef.current = draft.id;
      hasUnsavedChangesRef.current = false;
      setSaveStatus(serviceStatus === "offline" ? "offline" : "saved");
      trackMetric("autosave_success", { meta });
      trackBetaFromMeta("document_saved", meta, {
        wordCountBucket: wordCountBucket(getTextStats(textRef.current).words),
      });
    } catch (error) {
      console.error(error);
      setSaveStatus("retrying");
      // Keep emergency snapshot of latest editor text
      writeRecoverySnapshot({
        localId,
        title: docTitleRef.current,
        content: textRef.current,
        revision,
        updatedAt: new Date().toISOString(),
        serverId: docIdRef.current,
      });
      trackMetric("autosave_failure", { meta });
    }
  }, [serviceStatus]);

  const cancelInFlightRewrite = useCallback(() => {
    rewriteAbortRef.current?.abort();
    rewriteAbortRef.current = null;
    rewriteScopeRef.current = null;
    staleRewriteRef.current = null;
    setRewriteLoading(false);
    setRewriteError(null);
    setAiPreview(null);
    setPreviewRange(null);
    setParagraphPreview(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    undo();
    markUnsaved();
    notePossibleUndo(localDraftIdRef.current, contentRevisionRef.current);
    setAiPreview(null);
    setParagraphPreview(null);
    setPreviewRange(null);
    setActiveIssueId(null);
    grammarRequestId.current += 1;
  }, [canUndo, undo, markUnsaved]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    markUnsaved();
    setAiPreview(null);
    setParagraphPreview(null);
    setPreviewRange(null);
    setActiveIssueId(null);
    grammarRequestId.current += 1;
  }, [canRedo, redo, markUnsaved]);

  const applyIssueFilters = useCallback(
    (list: GrammarIssue[], ignored: Set<string>) =>
      list.filter(
        (i) =>
          !ignored.has(issueFingerprint(i)) &&
          !isIssueDictionarySuppressed(i, userDictionary)
      ),
    [userDictionary]
  );

  const visibleIssues = applyIssueFilters(issues, ignoredFingerprints);

  const syncToneCounts = useCallback(
    (base: ToneResult, issueList: GrammarIssue[], ignored: Set<string>) => {
      const count = applyIssueFilters(issueList, ignored).length;
      return {
        ...base,
        suggestion_count: count,
        summary: buildModeSummary(writingMode, count, {
          grammar: base.grammar_score,
          clarity: base.clarity_score,
          strength: base.resume_strength_score ?? base.grammar_score,
          impact: base.impact_score,
          professionalism: base.professionalism_score ?? base.grammar_score,
          clinical: base.clinical_clarity_score ?? base.clarity_score,
        }),
      };
    },
    [applyIssueFilters, writingMode]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("smartwrite-theme", "light");
  }, []);

  const refreshBackend = useCallback(async () => {
    setServiceStatus(await api.getServiceStatus());
  }, []);

  const loadDocuments = useCallback(async () => {
    const finalize = (list: Document[]) =>
      applyMetaToDocuments(
        list
          .map((doc) => ({ ...doc, title: sanitizeDocumentTitle(doc.title) }))
          .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      );

    try {
      const localDocuments = localDraftsAsDocuments();
      const { documents: serverDocuments } = await api.listDocuments();
      const merged = new Map(localDocuments.map((doc) => [doc.id, doc]));
      for (const document of serverDocuments) {
        const cached = localDocuments.find((doc) => doc.id === document.id);
        merged.set(document.id, {
          ...document,
          title: sanitizeDocumentTitle(document.title),
          local_id: cached?.local_id,
        });
      }
      setDocuments(finalize([...merged.values()]));
    } catch {
      setDocuments(finalize(localDraftsAsDocuments()));
    }
  }, []);

  useEffect(() => {
    refreshBackend();
    loadDocuments();
    const id = setInterval(refreshBackend, 15000);
    return () => clearInterval(id);
  }, [refreshBackend, loadDocuments]);

  useEffect(() => {
    if (backendOnline) void loadDocuments();
  }, [backendOnline, loadDocuments]);

  useEffect(() => {
    if (!hasUnsavedChangesRef.current) return;

    const saveLocalId = localDraftId;
    const saveRevision = contentRevisionRef.current;
    const saveTitle = docTitle;
    const saveContent = text;
    const saveServerId = docId;
    const saveMeta = createAsyncOpMeta(saveLocalId, saveRevision);

    // Emergency buffer for crash between keystrokes and debounce flush
    writeRecoverySnapshot({
      localId: saveLocalId,
      title: saveTitle,
      content: saveContent,
      revision: saveRevision,
      updatedAt: new Date().toISOString(),
      serverId: saveServerId,
    });

    const timer = setTimeout(() => {
      // Drop stale timers after a document switch
      if (saveLocalId !== localDraftIdRef.current) {
        trackBetaFromMeta("stale_save_dropped", saveMeta, { errorCode: "document_switch" });
        return;
      }
      if (saveMeta.clientRevision < contentRevisionRef.current) {
        trackBetaFromMeta("stale_save_dropped", saveMeta, { errorCode: "newer_revision" });
        return;
      }
      setSaveStatus(serviceStatus === "offline" ? "offline" : "saving");
      try {
        const draft = saveLocalDraft(
          saveTitle,
          saveContent,
          saveServerId,
          saveLocalId,
          saveRevision
        );
        if (saveLocalId !== localDraftIdRef.current) {
          trackBetaFromMeta("stale_save_dropped", saveMeta, { errorCode: "document_switch" });
          return;
        }
        if ((draft.revision ?? 0) > saveRevision) {
          trackBetaFromMeta("stale_save_dropped", saveMeta, { errorCode: "newer_stored" });
          return;
        }
        setLocalDraftId(draft.id);
        const savedDocument = localDraftsAsDocuments().find((doc) => doc.local_id === draft.id);
        if (savedDocument && activeDocumentId === savedDocument.id) {
          /* keep active */
        } else if (savedDocument && localDraftIdRef.current === draft.id) {
          setActiveDocumentId(savedDocument.id);
        }
        if (saveContent === textRef.current && saveLocalId === localDraftIdRef.current) {
          hasUnsavedChangesRef.current = false;
          setSaveStatus(serviceStatus === "offline" ? "offline" : "saved");
        }
        trackMetric("autosave_success", { meta: saveMeta });
        trackBetaFromMeta("document_saved", saveMeta, {
          wordCountBucket: wordCountBucket(getTextStats(saveContent).words),
        });
        setDocuments((current) => {
          const merged = new Map(current.map((doc) => [doc.id, doc]));
          for (const localDocument of applyMetaToDocuments(localDraftsAsDocuments())) {
            merged.set(localDocument.id, localDocument);
          }
          return applyMetaToDocuments(
            [...merged.values()].sort(
              (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)
            )
          );
        });
      } catch (error) {
        console.error(error);
        if (saveLocalId !== localDraftIdRef.current) return;
        setSaveStatus("retrying");
        trackMetric("autosave_failure", { meta: saveMeta });
        showToast("Couldn’t save changes. Retrying…", "error");
      }
    }, 850);

    return () => clearTimeout(timer);
  }, [text, docTitle, docId, localDraftId, showToast, serviceStatus, activeDocumentId]);

  // beforeunload only when genuinely unsaved
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Offline / reconnect — no spam retries while offline
  useEffect(() => {
    const goOffline = () => {
      setServiceStatus("offline");
      noteOfflineFallback(true);
      setSaveStatus((s) => (hasUnsavedChangesRef.current || s === "saving" ? "offline" : s));
    };
    const goOnline = () => {
      void (async () => {
        const status = await api.getServiceStatus();
        setServiceStatus(status);
        if (status !== "offline") noteOfflineFallback(false);
        if (hasUnsavedChangesRef.current) {
          flushPendingSave();
        } else if (status !== "offline") {
          setSaveStatus("saved");
        }
      })();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [flushPendingSave]);

  const runToneAnalysis = useCallback(async (content: string, silent = false) => {
    if (!content.trim()) {
      setTone(null);
      return;
    }
    const requestId = ++toneRequestId.current;
    if (!silent) setToneRefreshing(true);
    try {
      const result = await api.detectTone(content, userDictionary);
      if (requestId === toneRequestId.current) {
        setTone(result);
      }
    } catch {
      /* keep previous tone visible */
    } finally {
      if (requestId === toneRequestId.current) {
        setToneRefreshing(false);
      }
    }
  }, []);

  const runGrammarCheck = useCallback(
    async (options?: { silent?: boolean; mode?: WritingMode; documentId?: number | null }) => {
      const content = textRef.current;
      if (!content.trim()) return;

      const mode = options?.mode ?? writingModeRef.current;
      const requestId = ++grammarRequestId.current;
      const silent = options?.silent ?? false;
      const opMeta = createAsyncOpMeta(localDraftIdRef.current, contentRevisionRef.current);

      if (!silent) setChecking(true);
      else setAutoChecking(true);
      const started = performance.now();

      try {
        const targetDocumentId = options?.documentId !== undefined ? options.documentId : docId;
        const result = await api.checkGrammar(content, targetDocumentId, userDictionary, mode);
        if (requestId !== grammarRequestId.current) {
          trackMetric("analysis_stale_drop", { meta: opMeta, code: "sequencing" });
          trackBetaFromMeta("stale_analysis_dropped", opMeta, { errorCode: "sequencing" });
          return;
        }
        if (opMeta.documentKey !== localDraftIdRef.current) {
          trackMetric("stale_response_drop", { meta: opMeta, code: "document_switch" });
          trackBetaFromMeta("stale_analysis_dropped", opMeta, { errorCode: "document_switch" });
          return;
        }
        if (content !== textRef.current) {
          trackMetric("analysis_stale_drop", { meta: opMeta, code: "content_changed" });
          trackBetaFromMeta("stale_analysis_dropped", opMeta, { errorCode: "content_changed" });
          return;
        }

        const ignored = silent ? ignoredFingerprints : new Set<string>();
        if (!silent) setIgnoredFingerprints(ignored);

        const filtered = dedupeIssues(
          result.issues.filter((i) => !isIssueDictionarySuppressed(i, userDictionary))
        );
        setIssues(filtered);
        for (const issue of filtered.slice(0, 12)) {
          noteSuggestionShown(localDraftIdRef.current, issue.issue_type || "style", issue.id);
        }

        const visibleCount = applyIssueFilters(filtered, ignored).length;
        const scores = api.grammarResultToTone(
          result,
          tone?.tone ?? "Neutral",
          visibleCount,
          { mode, text: content }
        );
        setTone(scores);
        const latencyMs = Math.round(performance.now() - started);
        trackMetric("analysis_latency_ms", { value: latencyMs, meta: opMeta });
        trackBetaFromMeta("analysis_completed", opMeta, {
          latencyMs,
          wordCountBucket: wordCountBucket(getTextStats(content).words),
        });

        if (mode === "general") {
          void api.detectTone(content, userDictionary).then((t) => {
            if (requestId !== grammarRequestId.current) return;
            setTone(
              syncToneCounts(
                {
                  ...t,
                  grammar_score: result.grammar_score,
                  clarity_score: result.clarity_score,
                  clarity_suggestions: result.clarity_suggestions,
                },
                filtered,
                ignored
              )
            );
          }).catch((error: unknown) => {
            console.error(error);
          });
        }
      } catch (e) {
        console.error(e);
        trackBetaFromMeta("analysis_failed", opMeta, { errorCode: "ANALYSIS_ERROR" });
        if (!silent) {
          showToast("Grammar API offline — start the backend (port 8002).", "error");
        }
      } finally {
        if (requestId === grammarRequestId.current) {
          setChecking(false);
          setAutoChecking(false);
        }
      }
    },
    [
      docId,
      tone?.tone,
      userDictionary,
      ignoredFingerprints,
      applyIssueFilters,
      syncToneCounts,
      showToast,
    ]
  );

  // Initial check when backend comes online
  useEffect(() => {
    if (backendOnline && !didInitialCheck.current && textRef.current.length > 10) {
      didInitialCheck.current = true;
      void runGrammarCheck({
        silent: true,
        mode: writingModeRef.current,
      });
    }
  }, [backendOnline, runGrammarCheck]);

  // Run mode analysis when tab has text but no results yet (client rules work offline)
  useEffect(() => {
    if (text.trim().length <= 10 || checking || autoChecking) return;
    if (issues.length === 0 && tone === null) {
      void runGrammarCheck({ silent: true, mode: writingModeRef.current });
    }
  }, [writingMode, text, issues.length, tone, checking, autoChecking, runGrammarCheck]);

  // Cheap local checks quickly; reconcile with backend after a short pause
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (text.length <= 8) {
      if (!text.trim()) setIssues([]);
      return;
    }

    // Immediate local findings (no flicker wipe — merge into visible set)
    const local = dedupeIssues(
      detectGeneralEnhancements(text).filter(
        (i) =>
          !ignoredFingerprints.has(issueFingerprint(i)) &&
          !isIssueDictionarySuppressed(i, userDictionary)
      )
    );
    if (local.length) {
      setIssues((prev) => {
        if (!prev.length) return local;
        return dedupeIssues([...local, ...prev]);
      });
    }

    checkTimer.current = setTimeout(() => {
      void runGrammarCheck({ silent: true });
    }, 800);

    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [text, runGrammarCheck, ignoredFingerprints, userDictionary]);

  const trackSelection = () => {
    const ta = document.querySelector(".editor-textarea") as HTMLTextAreaElement | null;
    if (!ta) return;
    setSelection({ start: ta.selectionStart, end: ta.selectionEnd });
  };

  const selectedText =
    selection.end > selection.start ? text.slice(selection.start, selection.end) : "";

  const handleApplyIssue = async (issue: GrammarIssue, replacement: string) => {
    const next = applyReplacement(textRef.current, issue, replacement);
    if (next === textRef.current) {
      showToast("That suggestion no longer matches the text.", "info");
      setIssues((prev) => prev.filter((i) => i.id !== issue.id));
      return;
    }
    const fp = issueFingerprint(issue);
    const nextIgnored = new Set(ignoredFingerprints).add(fp);
    setIgnoredFingerprints(nextIgnored);
    setIssues((prev) => prev.filter((i) => i.id !== issue.id && issueFingerprint(i) !== fp));
    setText(next);
    setActiveIssueId(null);
    setSaveStatus("unsaved");
    noteSuggestionAccepted(
      localDraftIdRef.current,
      issue.issue_type || "style",
      replacement,
      contentRevisionRef.current
    );
    setFeedbackTarget("suggestion");
    setFeedbackKey(`sug-${issue.id}-${Date.now()}`);
    const activeKey = { id: activeDocumentId ?? 0, local_id: localDraftIdRef.current };
    patchDocumentMeta(activeKey, { dismissed: [...nextIgnored] });
    await runGrammarCheck({ silent: true });
  };

  const handleIgnoreIssue = (issue: GrammarIssue) => {
    const fp = issueFingerprint(issue);
    const nextIgnored = new Set(ignoredFingerprints).add(fp);
    setIgnoredFingerprints(nextIgnored);
    setIssues((prev) => prev.filter((i) => issueFingerprint(i) !== fp));
    if (activeIssueId === issue.id) setActiveIssueId(null);
    if (tone) setTone(syncToneCounts(tone, issues, nextIgnored));
    noteSuggestionDismissed(localDraftIdRef.current, issue.issue_type || "style");
    const activeKey = { id: activeDocumentId ?? 0, local_id: localDraftIdRef.current };
    patchDocumentMeta(activeKey, { dismissed: [...nextIgnored] });
  };

  const handleAddToDictionary = (issue: GrammarIssue) => {
    const term = issue.problem?.trim();
    if (!term || term.startsWith("(")) return;
    const next = addToUserDictionary(term);
    setUserDictionary(next);
    const remaining = issues.filter((i) => !isIssueDictionarySuppressed(i, next));
    setIssues(remaining);
    if (tone) setTone(syncToneCounts(tone, remaining, ignoredFingerprints));
    showToast(`Added "${term}" to your dictionary`, "success");
  };

  const handleSelectIssue = (issue: GrammarIssue) => {
    setActiveIssueId(issue.id);
    trackBetaEvent("suggestion_opened", {
      documentKeyHash: hashDocumentKey(localDraftIdRef.current),
      suggestionType: issue.issue_type || "style",
    });
    editorRef.current?.scrollToIssue(issue);
  };

  const handleCorrectAll = async () => {
    if (!visibleIssues.length) return;
    try {
      const result = await api.checkGrammar(text, docId, userDictionary);
      if (result.corrected_text) {
        textRef.current = result.corrected_text;
        setText(result.corrected_text);
        setIssues([]);
        setIgnoredFingerprints(new Set());
        showToast("All fixes applied", "success");
        await runToneAnalysis(result.corrected_text, true);
      } else {
        let next = text;
        for (const issue of [...visibleIssues].sort((a, b) => b.offset - a.offset)) {
          const rep = issue.suggestion || issue.replacements[0];
          if (rep) next = applyReplacement(next, issue, rep);
        }
        textRef.current = next;
        setText(next);
        setIssues([]);
        showToast("All fixes applied", "success");
        await runGrammarCheck();
      }
    } catch {
      showToast("Could not apply all fixes.", "error");
    }
  };

  const handleRewrite = async (
    mode: ToneMode,
    label: string,
    range?: { start: number; end: number; text: string } | string
  ) => {
    if (rewriteLoading) return;
    if (serviceStatus === "offline") {
      trackMetric("offline_fallback", { code: "rewrite_blocked" });
      noteOfflineFallback(true);
      setRewriteError({
        title: "Rewrite is temporarily unavailable",
        message: "You’re offline. Your document is safe — reconnect to use AI rewrite.",
        retry: () => setRewriteError(null),
      });
      return;
    }
    const explicitRange = typeof range === "object" ? range : undefined;
    const activeRange = explicitRange ?? (selection.end > selection.start ? selection : null);
    const start = activeRange?.start ?? 0;
    const end = activeRange?.end ?? text.length;
    const target =
      explicitRange?.text ?? (activeRange ? text.slice(activeRange.start, activeRange.end) : text);
    if (!target.trim()) {
      setRewriteError({
        title: "Select some text to rewrite",
        message: "Highlight a passage, then try Improve or Rewrite.",
        retry: () => setRewriteError(null),
      });
      return;
    }
    if (target.length > MAX_REWRITE_CHARS) {
      setRewriteError({
        title: "Selection is too long",
        message: "Selection is too long to rewrite at once. Try a smaller section.",
        retry: () => setRewriteError(null),
      });
      return;
    }
    const sessionAtStart = editorSessionKeyRef.current;
    const documentKey = localDraftIdRef.current;
    const revisionAtStart = contentRevisionRef.current;
    const opMeta = createAsyncOpMeta(documentKey, revisionAtStart);
    lastRewriteModeRef.current = mode;
    const scope: RewriteScope = {
      requestId: opMeta.requestId,
      documentKey,
      revision: revisionAtStart,
      start,
      end: activeRange ? end : text.length,
      sourceText: target,
      startedAt: opMeta.startedAt,
    };
    rewriteScopeRef.current = scope;
    setPreviewRange(activeRange ? { start, end } : null);
    setAiPreview(null);
    setRewriteError(null);
    rewriteAbortRef.current?.abort();
    const controller = new AbortController();
    rewriteAbortRef.current = controller;
    setRewriteLoading(true);
    const rewriteStarted = performance.now();
    trackBetaFromMeta("rewrite_requested", opMeta, {
      rewriteMode: mode,
      wordCountBucket: wordCountBucket(getTextStats(target).words),
    });
    try {
      const out = await api.rewrite(target, mode, docId, {
        signal: controller.signal,
        goals: {
          tone: writingGoals.tone,
          formality: writingGoals.formality,
          audience: writingGoals.audience,
          intent: writingGoals.intent,
        },
        documentType: writingGoals.documentType,
        meta: opMeta,
      });
      if (controller.signal.aborted || sessionAtStart !== editorSessionKeyRef.current) {
        trackMetric("stale_response_drop", { meta: opMeta, code: "abort_or_session" });
        return;
      }
      if (documentKey !== localDraftIdRef.current) {
        trackMetric("stale_response_drop", { meta: opMeta, code: "document_switch" });
        return;
      }
      const latencyMs = Math.round(performance.now() - rewriteStarted);
      if (out.source === "fallback") {
        trackMetric("rewrite_fallback", { meta: opMeta });
        trackBetaFromMeta("offline_fallback_started", opMeta, { rewriteMode: mode });
      } else {
        trackMetric("rewrite_success", { meta: opMeta });
      }
      trackBetaFromMeta("rewrite_succeeded", opMeta, { rewriteMode: mode, latencyMs });

      const stillMatches = scopesMatch(scope, {
        documentKey: localDraftIdRef.current,
        revision: contentRevisionRef.current,
        text: textRef.current,
      });
      if (!stillMatches) {
        trackMetric("stale_rewrite_blocked", { meta: opMeta });
        trackBetaFromMeta("stale_rewrite_blocked", opMeta, { rewriteMode: mode });
        staleRewriteRef.current = { improved: out.rewritten_text, label };
        setConfirmState({
          title: "This text changed while SmartWrite was preparing the rewrite.",
          message: "Your current document was not overwritten. Insert the rewrite as new text, or cancel.",
          confirmLabel: "Insert as new text",
          onConfirm: () => {
            const pending = staleRewriteRef.current;
            setConfirmState(null);
            if (!pending) return;
            setText(`${textRef.current.trimEnd()}\n\n${pending.improved}`);
            setIssues([]);
            staleRewriteRef.current = null;
            rewriteScopeRef.current = null;
            void runGrammarCheck({ silent: true });
          },
        });
        return;
      }
      setAiPreview({ original: target, improved: out.rewritten_text, label });
      setPreviewRange(activeRange ? { start, end } : null);
      setFeedbackTarget("rewrite");
      setFeedbackKey(`rw-${opMeta.requestId}`);
      showToast(
        out.source === "fallback"
          ? `${label} ready (offline rewrite)`
          : `${label} ready — review before replacing`,
        "success"
      );
      setAiDrawerOpen(true);
    } catch (err) {
      if (controller.signal.aborted || sessionAtStart !== editorSessionKeyRef.current) return;
      if (documentKey !== localDraftIdRef.current) return;
      console.error("[SmartWrite rewrite]", err);
      const facing = userFacingRewriteError(err);
      trackMetric("rewrite_failure", { code: facing.code, meta: opMeta });
      trackBetaFromMeta("rewrite_failed", opMeta, {
        rewriteMode: mode,
        errorCode: facing.code,
      });
      if (import.meta.env.DEV) {
        console.warn("[SmartWrite rewrite technical]", facing.code, err);
      }
      setRewriteError({
        title: facing.title,
        message: facing.message,
        retry: () => void handleRewrite(mode, label, range),
      });
    } finally {
      if (rewriteAbortRef.current === controller) rewriteAbortRef.current = null;
      if (sessionAtStart === editorSessionKeyRef.current) setRewriteLoading(false);
    }
  };

  const handleReplaceSelection = () => {
    if (!aiPreview) return;
    const scope = rewriteScopeRef.current;
    if (scope) {
      const ok = scopesMatch(scope, {
        documentKey: localDraftIdRef.current,
        revision: contentRevisionRef.current,
        text: textRef.current,
      });
      if (!ok) {
        staleRewriteRef.current = { improved: aiPreview.improved, label: aiPreview.label };
        setConfirmState({
          title: "This text changed while SmartWrite was preparing the rewrite.",
          message: "Your current document was not overwritten. Insert the rewrite as new text, or cancel.",
          confirmLabel: "Insert as new text",
          onConfirm: () => {
            const pending = staleRewriteRef.current;
            setConfirmState(null);
            if (!pending) return;
            setText(`${textRef.current.trimEnd()}\n\n${pending.improved}`);
            setAiPreview(null);
            setPreviewRange(null);
            rewriteScopeRef.current = null;
            staleRewriteRef.current = null;
            void runGrammarCheck({ silent: true });
          },
        });
        return;
      }
    }
    const range = previewRange;
    if (range && range.end > range.start) {
      setText(replaceSelection(textRef.current, range.start, range.end, aiPreview.improved));
    } else {
      setText(aiPreview.improved);
    }
    noteRewriteReplaced(
      localDraftIdRef.current,
      contentRevisionRef.current,
      lastRewriteModeRef.current
    );
    setIssues([]);
    setAiPreview(null);
    setPreviewRange(null);
    rewriteScopeRef.current = null;
    setAiDrawerOpen(false);
    void runGrammarCheck({ silent: true });
  };

  const handleInsertBelow = () => {
    if (!aiPreview) return;
    const range = previewRange;
    if (range && range.end > range.start) {
      const insert = `${textRef.current.slice(range.start, range.end)}\n\n${aiPreview.improved}`;
      setText(replaceSelection(textRef.current, range.start, range.end, insert));
    } else {
      setText(`${textRef.current.trimEnd()}\n\n${aiPreview.improved}`);
    }
    noteRewriteInserted(
      localDraftIdRef.current,
      contentRevisionRef.current,
      lastRewriteModeRef.current
    );
    setIssues([]);
    setAiPreview(null);
    setPreviewRange(null);
    rewriteScopeRef.current = null;
    setAiDrawerOpen(false);
    void runGrammarCheck({ silent: true });
  };

  const handleCopyRewrite = async () => {
    if (aiPreview) await navigator.clipboard.writeText(aiPreview.improved);
  };

  const handleAgentApply = (original: string, rewrite: string, label: string) => {
    setAiPreview({ original, improved: rewrite, label, kind: "rewrite" });
    setPreviewRange(selection.end > selection.start ? selection : null);
    showToast(`${label} ready — review in Before & After`, "success");
  };

  const handleSave = useCallback(async () => {
    const title = sanitizeDocumentTitle(docTitle);
    const content = textRef.current;
    if (!content.trim() && !title) {
      showToast("Nothing to save — add a title or some text first.", "info");
      return;
    }

    const saveLocalId = localDraftIdRef.current;
    const saveRevision = contentRevisionRef.current;
    const meta = createAsyncOpMeta(saveLocalId, saveRevision);
    setSaving(true);
    setSaveStatus("saving");
    try {
      if (backendOnline) {
        const doc = await api.saveDocument(title, content, docId);
        if (saveLocalId !== localDraftIdRef.current) {
          trackBetaFromMeta("stale_save_dropped", meta, { errorCode: "document_switch" });
          return;
        }
        setDocId(doc.id);
        setActiveDocumentId(doc.id);
        setDocTitle(doc.title);
        const draft = saveLocalDraft(doc.title, content, doc.id, saveLocalId, saveRevision);
        setLocalDraftId(draft.id);
        confirmServerRevision(draft.id, saveRevision);
        hasUnsavedChangesRef.current = false;
        setSaveStatus("saved");
        trackMetric("autosave_success", { meta });
        trackBetaFromMeta("document_saved", meta, {
          wordCountBucket: wordCountBucket(getTextStats(content).words),
        });
        showToast(`Saved "${doc.title}"`, "success");
        const entry = saveHistoryEntry({
          title: doc.title,
          content,
          mode: writingModeRef.current,
          score: tone?.writing_scores?.overall ?? tone?.grammar_score ?? 0,
          preview: "",
        });
        void entry;
        setHistory(loadHistory());
        await loadDocuments();
      } else {
        const draft = saveLocalDraft(title, content, docId, saveLocalId, saveRevision);
        if (saveLocalId !== localDraftIdRef.current) {
          trackBetaFromMeta("stale_save_dropped", meta, { errorCode: "document_switch" });
          return;
        }
        setLocalDraftId(draft.id);
        const savedDocument = localDraftsAsDocuments().find((item) => item.local_id === draft.id);
        if (savedDocument) setActiveDocumentId(savedDocument.id);
        hasUnsavedChangesRef.current = false;
        void loadDocuments();
        setSaveStatus("saved");
        trackMetric("autosave_success", { meta });
        trackBetaFromMeta("document_saved", meta, {
          wordCountBucket: wordCountBucket(getTextStats(content).words),
        });
        saveHistoryEntry({
          title,
          content,
          mode: writingModeRef.current,
          score: tone?.writing_scores?.overall ?? tone?.grammar_score ?? 0,
          preview: "",
        });
        setHistory(loadHistory());
        showToast("Saved locally — start the backend to sync to the server.", "info");
      }
    } catch (e) {
      console.error(e);
      const draft = saveLocalDraft(title, content, docId, saveLocalId, saveRevision);
      setLocalDraftId(draft.id);
      const savedDocument = localDraftsAsDocuments().find((item) => item.local_id === draft.id);
      if (savedDocument) setActiveDocumentId(savedDocument.id);
      hasUnsavedChangesRef.current = false;
      void loadDocuments();
      setSaveStatus("saved");
      trackMetric("autosave_failure", { meta });
      trackBetaFromMeta("document_saved", meta, {
        wordCountBucket: wordCountBucket(getTextStats(content).words),
        errorCode: "api_unreachable_local_ok",
      });
      saveHistoryEntry({
        title,
        content,
        mode: writingModeRef.current,
        score: tone?.writing_scores?.overall ?? tone?.grammar_score ?? 0,
        preview: "",
      });
      setHistory(loadHistory());
      showToast(
        "Could not reach the API — draft saved in this browser only.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }, [backendOnline, docTitle, docId, showToast, loadDocuments, tone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (aiPreview) {
          handleReplaceSelection();
          return;
        }
        if (paragraphPreview) {
          // paragraph replace handled via dedicated control
          return;
        }
        void runGrammarCheck({ mode: writingModeRef.current });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAiDrawerOpen((open) => !open);
        setFocusAgentsTab(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === "Escape") {
        rewriteAbortRef.current?.abort();
        setAiDrawerOpen(false);
        setMobileSheet(null);
        setActiveIssueId(null);
        setParagraphPreview(null);
        setAiPreview(null);
        setRewriteError(null);
        setConfirmState(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runGrammarCheck, handleSave, handleUndo, handleRedo, aiPreview, paragraphPreview]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const apply = () => {
      if (mq.matches) setDocumentsCollapsed(true);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const handleTextChange = (value: string) => {
    setText(value);
    textRef.current = value;
    setSaveStatus("unsaved");
    noteTextChangedAfterAccept(localDraftIdRef.current, value);
    if (!value.trim()) {
      grammarRequestId.current += 1;
      setIssues([]);
      setTone(null);
      setActiveIssueId(null);
      setChecking(false);
      setAutoChecking(false);
    }
  };

  const handleNewDoc = () => {
    flushPendingSave();
    cancelInFlightRewrite();
    grammarRequestId.current += 1;
    grammarAbortRef.current?.abort();
    setDocId(null);
    setActiveDocumentId(null);
    const nextLocal = `local-${Date.now()}`;
    setLocalDraftId(nextLocal);
    localDraftIdRef.current = nextLocal;
    contentRevisionRef.current = 0;
    setDocTitle("Untitled");
    setSaveStatus("unsaved");
    hasUnsavedChangesRef.current = false;
    resetText("");
    textRef.current = "";
    setIssues([]);
    setIgnoredFingerprints(new Set());
    setTone(null);
    setWritingGoals(DEFAULT_GOALS);
    setWritingMode("general");
    writingModeRef.current = "general";
    didInitialCheck.current = false;
    setEditorSessionKey((k) => k + 1);
    setWorkspaceView("editor");
    setSidebarNav("documents");
    trackBetaEvent("document_created", {
      documentKeyHash: hashDocumentKey(nextLocal),
      clientRevision: 0,
      surface: "new_document",
    });
  };

  const handleParagraphRewrite = (mode: ToneMode = "clearer", label = "Paragraph rewrite") => {
    if (rewriteLoading) return;
    const range = editorRef.current?.selectParagraph();
    if (!range) {
      showToast("Place your cursor inside a paragraph first.", "info");
      return;
    }
    const sessionAtStart = editorSessionKeyRef.current;
    setSelection({ start: range.start, end: range.end });
    setParagraphPreview(null);
    setRewriteError(null);
    rewriteAbortRef.current?.abort();
    const controller = new AbortController();
    rewriteAbortRef.current = controller;
    setRewriteLoading(true);
    void (async () => {
      try {
        const out = await api.rewrite(range.text, mode, docId, { signal: controller.signal });
        if (controller.signal.aborted || sessionAtStart !== editorSessionKeyRef.current) return;
        const current = textRef.current.slice(range.start, range.end);
        const preview = { original: range.text, improved: out.rewritten_text, label };
        setParagraphPreview(preview);
        setPreviewRange({ start: range.start, end: range.end });
        setAiPreview(preview);
        if (current !== range.text) {
          showToast("This text changed while the rewrite was being generated.", "info");
        } else {
          showToast(
            out.source === "fallback" ? `${label} ready (offline rewrite)` : `${label} ready`,
            "success"
          );
        }
      } catch (err) {
        if (controller.signal.aborted || sessionAtStart !== editorSessionKeyRef.current) return;
        console.error("[SmartWrite rewrite]", err);
        const facing = userFacingRewriteError(err);
        trackMetric("rewrite_failure", { code: facing.code });
        setRewriteError({
          title: facing.title,
          message: facing.message,
          retry: () => handleParagraphRewrite(mode, label),
        });
      } finally {
        if (rewriteAbortRef.current === controller) rewriteAbortRef.current = null;
        if (sessionAtStart === editorSessionKeyRef.current) setRewriteLoading(false);
      }
    })();
  };

  const handleParagraphReplace = () => {
    if (!paragraphPreview || !previewRange) return;
    const current = textRef.current.slice(previewRange.start, previewRange.end);
    if (current !== paragraphPreview.original) {
      showToast("This text changed while the rewrite was being generated.", "info");
      return;
    }
    setText(
      replaceSelection(
        textRef.current,
        previewRange.start,
        previewRange.end,
        paragraphPreview.improved
      )
    );
    setParagraphPreview(null);
    setAiPreview(null);
    setPreviewRange(null);
    void runGrammarCheck();
  };

  const openEditorDocument = (
    title: string,
    content: string,
    mode: WritingMode = "general",
    options?: { seedDemoIssues?: boolean; goals?: WritingGoals }
  ) => {
    flushPendingSave();
    cancelInFlightRewrite();
    setWritingMode(mode);
    writingModeRef.current = mode;
    setWritingGoals(options?.goals ?? PRESET_GOALS[mode]);
    setDocId(null);
    setActiveDocumentId(null);
    const nextLocal = `local-${Date.now()}`;
    setLocalDraftId(nextLocal);
    localDraftIdRef.current = nextLocal;
    setDocTitle(sanitizeDocumentTitle(title));
    resetText(content);
    textRef.current = content;
    setIgnoredFingerprints(new Set());
    if (options?.seedDemoIssues && content === DEMO_INLINE_TEXT) {
      setIssues(DEMO_INLINE_ISSUES);
      setTone(DEMO_INLINE_TONE);
    } else {
      setIssues([]);
      setTone(null);
    }
    setEditorSessionKey((k) => k + 1);
    setWorkspaceView("editor");
    setSidebarNav("documents");
    markUnsaved();
    trackBetaEvent("document_created", {
      documentKeyHash: hashDocumentKey(nextLocal),
      clientRevision: 0,
      wordCountBucket: wordCountBucket(getTextStats(content).words),
      surface: "editor_open",
    });
    if (content.trim()) {
      void runGrammarCheck({ silent: true, mode });
    }
  };

  const handleStarter = (templateId: string, _options?: { openGoals?: boolean }) => {
    if (templateId === "demo-inline") {
      openEditorDocument("Inline suggestions demo", DEMO_INLINE_TEXT, "general", {
        seedDemoIssues: true,
      });
      trackBetaEvent("template_used", { templateType: "demo-inline" });
      return;
    }
    const template = getTemplate(templateId) ?? DOCUMENT_TEMPLATES[0];
    if (!template) return;
    openEditorDocument(template.title, template.content, template.mode, {
      goals: goalsForTemplate(template),
    });
    trackBetaEvent("template_used", { templateType: template.id });
  };

  const handleSidebarNavigate = (nav: SidebarNav) => {
    setSidebarNav(nav);
    if (nav === "home") setWorkspaceView("home");
    else if (nav === "documents") setWorkspaceView("documents");
    else if (nav === "templates") setWorkspaceView("templates");
  };

  const handleSelectDocument = (document: Document) => {
    flushPendingSave();
    cancelInFlightRewrite();
    grammarRequestId.current += 1;
    toneRequestId.current += 1;
    grammarAbortRef.current?.abort();
    setDocId(document.id > 0 ? document.id : null);
    setActiveDocumentId(document.id);
    const nextLocal = document.local_id ?? `server-${document.id}`;
    setLocalDraftId(nextLocal);
    localDraftIdRef.current = nextLocal;
    const stored = getLocalDraft(nextLocal);
    const draftRev = stored?.revision ?? 0;
    const recovered = restoreRecoveryIfNewer(nextLocal, draftRev);
    const openContent = recovered?.content ?? document.content;
    const openTitle = recovered
      ? sanitizeDocumentTitle(recovered.title)
      : sanitizeDocumentTitle(document.title);
    contentRevisionRef.current = recovered?.revision ?? draftRev;
    setDocTitle(openTitle);
    resetText(openContent);
    textRef.current = openContent;
    hasUnsavedChangesRef.current = Boolean(recovered);
    setSaveStatus(recovered ? "unsaved" : "saved");
    if (recovered) {
      const recoverMeta = createAsyncOpMeta(nextLocal, recovered.revision);
      trackMetric("recovery_restore", { meta: recoverMeta });
      trackBetaFromMeta("recovery_restored", recoverMeta);
      showToast("Restored unsaved work from before the last interruption.", "info");
    }
    trackBetaEvent("document_opened", {
      documentKeyHash: hashDocumentKey(nextLocal),
      clientRevision: contentRevisionRef.current,
      wordCountBucket: wordCountBucket(getTextStats(openContent).words),
    });
    setIssues([]);
    const meta = getDocumentMeta(document);
    setIgnoredFingerprints(new Set(meta.dismissed ?? []));
    if (meta.goals) {
      setWritingGoals({ ...DEFAULT_GOALS, ...meta.goals } as WritingGoals);
    } else {
      setWritingGoals(DEFAULT_GOALS);
    }
    if (meta.writing_mode) {
      setWritingMode(meta.writing_mode as WritingMode);
      writingModeRef.current = meta.writing_mode as WritingMode;
    }
    setActiveIssueId(null);
    setTone(null);
    setSelection({ start: 0, end: 0 });
    setEditorSessionKey((key) => key + 1);
    setWorkspaceView("editor");
    setSidebarNav("documents");
    if (document.content.trim()) {
      void runGrammarCheck({
        silent: true,
        mode: writingModeRef.current,
        documentId: document.id > 0 ? document.id : null,
      });
    }
  };

  const permanentlyDeleteDocument = async (document: Document) => {
    try {
      if (document.id > 0) {
        if (backendOnline) await api.deleteDocument(document.id);
      }
      if (document.local_id) deleteLocalDraft(document.local_id);
      clearDocumentMeta(document);
      await loadDocuments();
      if (activeDocumentId === document.id) handleNewDoc();
      showToast(`Deleted "${sanitizeDocumentTitle(document.title)}"`, "success");
    } catch (error) {
      console.error(error);
      showToast(`Could not delete "${sanitizeDocumentTitle(document.title)}".`, "error");
    }
  };

  const handleDeleteDocument = (document: Document) => {
    setConfirmState({
      title: "Delete permanently?",
      message: `"${sanitizeDocumentTitle(document.title)}" will be removed forever.`,
      confirmLabel: "Delete permanently",
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void permanentlyDeleteDocument(document);
      },
    });
  };

  const handleMoveToTrash = (document: Document) => {
    if (activeDocumentId === document.id) flushPendingSave();
    patchDocumentMeta(document, { trashed: true, trashed_at: new Date().toISOString() });
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === document.id && doc.local_id === document.local_id
          ? { ...doc, trashed: true, trashed_at: new Date().toISOString() }
          : doc
      )
    );
    if (activeDocumentId === document.id) handleNewDoc();
    showToast(`Moved "${sanitizeDocumentTitle(document.title)}" to trash`, "info");
  };

  const handleRestoreDocument = (document: Document) => {
    patchDocumentMeta(document, { trashed: false, trashed_at: undefined });
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === document.id && doc.local_id === document.local_id
          ? { ...doc, trashed: false, trashed_at: undefined }
          : doc
      )
    );
    showToast(`Restored "${sanitizeDocumentTitle(document.title)}"`, "success");
  };

  const handleToggleFavorite = (document: Document) => {
    const next = !document.favorite;
    patchDocumentMeta(document, { favorite: next });
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === document.id && doc.local_id === document.local_id
          ? { ...doc, favorite: next }
          : doc
      )
    );
  };

  const handleRenameDocument = (document: Document, title: string) => {
    const nextTitle = sanitizeDocumentTitle(title);
    const isActive = activeDocumentId === document.id;
    const content = isActive ? textRef.current : document.content;
    if (document.local_id) {
      saveLocalDraft(nextTitle, content, document.id > 0 ? document.id : null, document.local_id);
    }
    setDocuments((current) =>
      current
        .map((doc) =>
          doc.id === document.id && doc.local_id === document.local_id
            ? { ...doc, title: nextTitle, content, updated_at: new Date().toISOString() }
            : doc
        )
        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    );
    if (isActive) {
      setDocTitle(nextTitle);
      hasUnsavedChangesRef.current = false;
      setSaveStatus("saved");
    }
    showToast(`Renamed to "${nextTitle}"`, "success");
  };

  const handleDuplicateDocument = (document: Document) => {
    const draft = saveLocalDraft(
      `${sanitizeDocumentTitle(document.title)} (copy)`,
      document.content,
      null
    );
    void loadDocuments();
    const created = localDraftsAsDocuments().find((doc) => doc.local_id === draft.id);
    if (created) handleSelectDocument(created);
    showToast("Document duplicated", "success");
  };

  const handleGoalsChange = (goals: WritingGoals, mode: WritingMode) => {
    setWritingGoals(goals);
    setWritingMode(mode);
    writingModeRef.current = mode;
    patchDocumentMeta(
      { id: activeDocumentId ?? 0, local_id: localDraftIdRef.current },
      { goals, writing_mode: mode }
    );
    void runGrammarCheck({ mode });
  };

  const handleAskAgentFromEditor = () => {
    setAiDrawerOpen(true);
    showToast("Ask SmartWrite about this passage.", "info");
  };

  const handleDocumentTitleChange = (title: string) => {
    setDocTitle(sanitizeDocumentTitle(title) === "Untitled" && !title.trim() ? "" : title);
    hasUnsavedChangesRef.current = true;
    setSaveStatus("unsaved");
  };

  const handleClearEditor = () => {
    if (!text.trim() || window.confirm("Clear all text in the editor?")) {
      setText("");
      textRef.current = "";
      setIssues([]);
      setTone(null);
      setAiPreview(null);
      setSaveStatus("unsaved");
    }
  };

  const handleCopyText = async () => {
    if (!text.trim()) {
      showToast("Nothing to copy.", "info");
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard.", "success");
  };

  const handleOpenHistory = (entry: HistoryEntry) => {
    grammarRequestId.current += 1;
    setWritingMode(entry.mode);
    writingModeRef.current = entry.mode;
    setWritingGoals(PRESET_GOALS[entry.mode]);
    setDocId(null);
    setActiveDocumentId(null);
    setLocalDraftId(`local-${Date.now()}`);
    setDocTitle(sanitizeDocumentTitle(entry.title));
    setWorkspaceView("editor");
    setSidebarNav("documents");
    resetText(entry.content);
    textRef.current = entry.content;
    hasUnsavedChangesRef.current = false;
    setSaveStatus("saved");
    setIssues([]);
    setTone(null);
    setAiPreview(null);
    setPreviewRange(null);
    setSelection({ start: 0, end: 0 });
    setEditorSessionKey((k) => k + 1);
    void runGrammarCheck({ silent: true, mode: entry.mode, documentId: null });
  };

  const insightsPanelProps = {
    tone,
    checking,
    toneRefreshing,
    issues: visibleIssues,
    activeIssueId,
    writingMode,
    onSelectIssue: handleSelectIssue,
    onApplyIssue: handleApplyIssue,
    onIgnoreIssue: handleIgnoreIssue,
    onAddToDictionary: handleAddToDictionary,
    text,
    selectedText,
    documentId: docId,
    onAgentApply: handleAgentApply,
    onToneAdjust: (mode: ToneMode, label: string) => void handleRewrite(mode, label),
    focusAgentsTab,
    onAgentsTabFocused: () => setFocusAgentsTab(false),
    onAskSmartWrite: () => setAiDrawerOpen(true),
    writingGoals,
  };

  const showBrowse = workspaceView === "home" || workspaceView === "documents" || workspaceView === "templates";
  const showEditor = workspaceView === "editor";

  return (
    <div className="app">
      <Toast messages={toasts} onDismiss={dismissToast} />
      <ServiceNotice status={serviceStatus} />
      <RewriteErrorDialog
        open={Boolean(rewriteError)}
        title={rewriteError?.title ?? ""}
        message={rewriteError?.message ?? ""}
        onRetry={() => rewriteError?.retry()}
        onCancel={() => setRewriteError(null)}
      />
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => {
          staleRewriteRef.current = null;
          setConfirmState(null);
        }}
      />
      {showEditor && (
        <TopBar
          docTitle={docTitle}
          onDocTitleChange={handleDocumentTitleChange}
          text={text}
          writingMode={writingMode}
          goals={writingGoals}
          onGoalsChange={handleGoalsChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onCheckGrammar={() => void runGrammarCheck({ mode: writingModeRef.current })}
          onSave={handleSave}
          onApplyAll={() => void handleCorrectAll()}
          onNewDoc={handleNewDoc}
          onClear={handleClearEditor}
          onCopy={() => void handleCopyText()}
          canApplyAll={visibleIssues.some((i) => i.suggestion || i.replacements[0])}
          checking={checking}
          saving={saving}
          saveStatus={saveStatus}
          docsCollapsed={documentsCollapsed}
          onToggleDocs={() => {
            if (window.matchMedia("(max-width: 900px)").matches) {
              setMobileDocumentsOpen(true);
            } else {
              setDocumentsCollapsed((collapsed) => !collapsed);
            }
          }}
          onOpenAI={() => setAiDrawerOpen(true)}
          onGoHome={() => handleSidebarNavigate("home")}
          history={history}
          onOpenHistory={handleOpenHistory}
        />
      )}

      <div
        className={`app-body${documentsCollapsed ? " docs-collapsed" : ""}${
          insightsCollapsed || showBrowse ? " insights-collapsed" : ""
        }`}
      >
        <DocumentsSidebar
          documents={documents.filter((doc) => !doc.trashed)}
          activeId={activeDocumentId}
          mobileOpen={mobileDocumentsOpen}
          collapsed={documentsCollapsed}
          activeNav={sidebarNav}
          onSelect={handleSelectDocument}
          onNew={() => {
            handleNewDoc();
            setMobileDocumentsOpen(false);
          }}
          onDelete={handleDeleteDocument}
          onClose={() => setMobileDocumentsOpen(false)}
          onCollapse={() => setDocumentsCollapsed(true)}
          onNavigate={handleSidebarNavigate}
        />

        <div className="app-center">
          {workspaceView === "home" && (
            <HomeDashboard
              documents={documents.filter((doc) => !doc.trashed)}
              onNew={handleNewDoc}
              onOpenDocument={handleSelectDocument}
              onOpenTemplate={handleStarter}
              onViewDocuments={() => handleSidebarNavigate("documents")}
              onViewTemplates={() => handleSidebarNavigate("templates")}
            />
          )}
          {workspaceView === "documents" && (
            <PanelErrorBoundary
              title="Couldn't load documents"
              message="Your drafts are still saved locally. Try again."
            >
              <DocumentsPage
                documents={documents}
                onNew={handleNewDoc}
                onOpen={handleSelectDocument}
                onDelete={handleDeleteDocument}
                onRename={handleRenameDocument}
                onDuplicate={handleDuplicateDocument}
                onToggleFavorite={handleToggleFavorite}
                onMoveToTrash={handleMoveToTrash}
                onRestore={handleRestoreDocument}
                onDeleteForever={handleDeleteDocument}
              />
            </PanelErrorBoundary>
          )}
          {workspaceView === "templates" && (
            <PanelErrorBoundary
              title="Couldn't load templates"
              message="Your document is safe. Try again."
            >
              <TemplatesPage onOpenTemplate={handleStarter} />
            </PanelErrorBoundary>
          )}
          {showEditor && (
            <main className="editor-main">
              <div onMouseUp={trackSelection} onKeyUp={trackSelection} className="editor-wrap">
                <Editor
                  key={editorSessionKey}
                  ref={editorRef}
                  text={text}
                  onChange={handleTextChange}
                  saveStatus={saveStatus}
                  issues={issues}
                  visibleIssues={visibleIssues}
                  activeIssueId={activeIssueId}
                  hoveredIssueId={hoveredIssueId}
                  onIssueClick={handleSelectIssue}
                  onIssueHover={setHoveredIssueId}
                  onApplyFromEditor={(issue) =>
                    handleApplyIssue(issue, issue.suggestion || issue.replacements[0] || "")
                  }
                  onIgnoreFromEditor={handleIgnoreIssue}
                  onAskAgentFromEditor={handleAskAgentFromEditor}
                  selection={selection}
                  toolbarLoading={rewriteLoading}
                  onToolbarPreset={handleRewrite}
                  onParagraphRewrite={handleParagraphRewrite}
                  onOpenAI={() => setAiDrawerOpen(true)}
                  documentHasText={text.trim().length > 0}
                  paragraphPreview={paragraphPreview}
                  onParagraphReplace={handleParagraphReplace}
                  onParagraphDismiss={() => {
                    setParagraphPreview(null);
                  }}
                  emptyOverlay={
                    <EmptyState
                      variant="hero"
                      title="Start writing"
                      message="Type or paste text to begin."
                      onStart={() => {
                        openEditorDocument(
                          "Inline suggestions demo",
                          DEMO_INLINE_TEXT,
                          "general",
                          { seedDemoIssues: true }
                        );
                      }}
                      starters={EMPTY_STARTERS}
                      onStarter={handleStarter}
                    />
                  }
                />
              </div>
            </main>
          )}
        </div>

        {showEditor && !insightsCollapsed && (
          <PanelErrorBoundary
            title="Suggestions couldn't load"
            message="Your document is safe."
          >
            <InsightsPanel {...insightsPanelProps} />
          </PanelErrorBoundary>
        )}
      </div>

      {aiDrawerOpen && (
        <AiRewriteDrawer
          preview={aiPreview}
          replaceLabel={previewRange ? "Replace" : "Replace document"}
          loading={rewriteLoading}
          onRewrite={handleRewrite}
          onParagraphRewrite={() => handleParagraphRewrite()}
          onReplace={handleReplaceSelection}
          onInsertBelow={handleInsertBelow}
          onCopy={() => void handleCopyRewrite()}
          onDismissPreview={() => {
            if (aiPreview) {
              trackBetaEvent("rewrite_cancelled", {
                documentKeyHash: hashDocumentKey(localDraftIdRef.current),
                rewriteMode: lastRewriteModeRef.current,
              });
            }
            setAiPreview(null);
            setPreviewRange(null);
            rewriteScopeRef.current = null;
          }}
          onClose={() => {
            rewriteAbortRef.current?.abort();
            setAiDrawerOpen(false);
          }}
        />
      )}

      {feedbackKey && (
        <HelpfulnessPrompt
          target={feedbackTarget}
          eventKey={feedbackKey}
          onDone={() => setFeedbackKey(null)}
        />
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobile panels">
        <button
          type="button"
          className={mobileSheet === "suggestions" ? "active" : ""}
          onClick={() => setMobileSheet((s) => (s === "suggestions" ? null : "suggestions"))}
        >
          Suggestions
        </button>
        <button
          type="button"
          className={mobileSheet === "insights" ? "active" : ""}
          onClick={() => setMobileSheet((s) => (s === "insights" ? null : "insights"))}
        >
          Score
        </button>
        <button type="button" onClick={() => setAiDrawerOpen(true)}>
          AI
        </button>
      </nav>

      <button
        type="button"
        className={`mobile-sheet-backdrop${mobileSheet ? " open" : ""}`}
        aria-label="Close panel"
        onClick={() => setMobileSheet(null)}
      />
      <div className={`mobile-sheet${mobileSheet ? " open" : ""}`} aria-hidden={!mobileSheet}>
        <div className="mobile-sheet-handle"><span /></div>
        {mobileSheet && (
          <PanelErrorBoundary
            title="Suggestions couldn't load"
            message="Your document is safe."
          >
            <InsightsPanel
              {...insightsPanelProps}
              preferredTab={mobileSheet === "insights" ? "insights" : "suggestions"}
            />
          </PanelErrorBoundary>
        )}
      </div>
    </div>
  );
}
