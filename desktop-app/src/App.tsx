import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import AppSidebar from "./components/AppSidebar";
import ScorePanel from "./components/ScorePanel";
import BeforeAfterPanel from "./components/BeforeAfterPanel";
import EmptyState from "./components/EmptyState";
import Header from "./components/Header";
import IssuesPanel from "./components/IssuesPanel";
import RewritePanel from "./components/RewritePanel";
import BackendBanner from "./components/BackendBanner";
import Toast from "./components/Toast";
import WritingModeBar from "./components/WritingModeBar";
import WritingEditor, { type WritingEditorHandle } from "./editor/WritingEditor";
import { useToast } from "./hooks/useToast";
import * as api from "./services/api";
import {
  addToUserDictionary,
  isIssueDictionarySuppressed,
  loadUserDictionary,
} from "./services/dictionary";
import type {
  AiRewritePreview,
  GrammarIssue,
  HistoryEntry,
  SaveStatus,
  SidebarView,
  Theme,
  ToneMode,
  ToneResult,
  WritingMode,
} from "./types";
import { MODE_INFO } from "./constants/modeConfig";
import { getTemplate } from "./constants/templates";
import { buildModeSummary } from "./services/modeTone";
import { saveLocalDraft } from "./services/draftStorage";
import {
  deleteHistoryEntry,
  downloadTextFile,
  loadHistory,
  saveHistoryEntry,
} from "./services/scoring";
import "./App.css";

function applyReplacement(text: string, issue: GrammarIssue, replacement: string): string {
  if (issue.length === 0) {
    return text.slice(0, issue.offset) + replacement + text.slice(issue.offset);
  }
  return text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length);
}

function replaceSelection(text: string, start: number, end: number, replacement: string): string {
  return text.slice(0, start) + replacement + text.slice(end);
}

const INITIAL_TEXT = MODE_INFO.general.sampleText;

export default function App() {
  const editorRef = useRef<WritingEditorHandle>(null);
  const textRef = useRef(INITIAL_TEXT);
  const grammarRequestId = useRef(0);
  const toneRequestId = useRef(0);
  const didInitialCheck = useRef(false);
  const writingModeRef = useRef<WritingMode>("general");

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("smartwrite-theme");
    return (saved as Theme) || "light";
  });
  const [text, setText] = useState(INITIAL_TEXT);
  const [writingMode, setWritingMode] = useState<WritingMode>("general");
  writingModeRef.current = writingMode;
  const [sidebarView, setSidebarView] = useState<SidebarView>("editor");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);
  const [tone, setTone] = useState<ToneResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [toneRefreshing, setToneRefreshing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<AiRewritePreview | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [docId, setDocId] = useState<number | null>(null);
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("unsaved");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [userDictionary, setUserDictionary] = useState<string[]>(() => loadUserDictionary());
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewritePanelRef = useRef<HTMLElement>(null);
  const [editorSessionKey, setEditorSessionKey] = useState(0);
  const [lastEdited, setLastEdited] = useState<string | null>(() => new Date().toISOString());
  const { messages: toasts, showToast, dismissToast } = useToast();

  const apiBaseUrl =
    (typeof window !== "undefined" &&
      (window as Window & { smartwrite?: { apiBaseUrl: string } }).smartwrite?.apiBaseUrl) ||
    "http://127.0.0.1:8002";

  textRef.current = text;

  const applyIssueFilters = useCallback(
    (list: GrammarIssue[], ignored: Set<string>) =>
      list.filter(
        (i) => !ignored.has(i.id) && !isIssueDictionarySuppressed(i, userDictionary)
      ),
    [userDictionary]
  );

  const visibleIssues = applyIssueFilters(issues, ignoredIds);

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
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("smartwrite-theme", theme);
  }, [theme]);

  const refreshBackend = useCallback(async () => {
    setBackendOnline(await api.healthCheck());
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      await api.listDocuments();
    } catch {
      /* API optional — history uses localStorage */
    }
  }, []);

  useEffect(() => {
    refreshBackend();
    loadDocuments();
    const id = setInterval(refreshBackend, 15000);
    return () => clearInterval(id);
  }, [refreshBackend, loadDocuments]);

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
    async (options?: { silent?: boolean; mode?: WritingMode }) => {
      const content = textRef.current;
      if (!content.trim()) return;

      const mode = options?.mode ?? writingModeRef.current;
      const requestId = ++grammarRequestId.current;
      const silent = options?.silent ?? false;

      if (!silent) setChecking(true);
      else setAutoChecking(true);

      try {
        const result = await api.checkGrammar(content, docId, userDictionary, mode);
        if (requestId !== grammarRequestId.current) return;
        if (content !== textRef.current) return;

        const ignored = silent ? ignoredIds : new Set<string>();
        if (!silent) setIgnoredIds(ignored);

        const filtered = result.issues.filter(
          (i) => !isIssueDictionarySuppressed(i, userDictionary)
        );
        setIssues(filtered);

        const visibleCount = applyIssueFilters(filtered, ignored).length;
        const scores = api.grammarResultToTone(
          result,
          tone?.tone ?? "Neutral",
          visibleCount,
          { mode, text: content }
        );
        setTone(scores);

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
          });
        }
      } catch (e) {
        console.error(e);
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
      ignoredIds,
      applyIssueFilters,
      syncToneCounts,
      showToast,
    ]
  );

  // Initial check when backend comes online
  useEffect(() => {
    if (backendOnline && !didInitialCheck.current && textRef.current.length > 10) {
      didInitialCheck.current = true;
      void runGrammarCheck({ silent: true, mode: writingModeRef.current });
    }
  }, [backendOnline, runGrammarCheck]);

  // Run mode analysis when tab has text but no results yet (client rules work offline)
  useEffect(() => {
    if (text.trim().length <= 10 || checking || autoChecking) return;
    if (issues.length === 0 && tone === null) {
      void runGrammarCheck({ silent: true, mode: writingModeRef.current });
    }
  }, [writingMode, text, issues.length, tone, checking, autoChecking, runGrammarCheck]);

  // Slow auto-check while typing — keeps previous results visible until new ones arrive
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!backendOnline || text.length <= 10) return;

    checkTimer.current = setTimeout(() => {
      void runGrammarCheck({ silent: true });
    }, 3000);

    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [text, backendOnline, runGrammarCheck]);

  const trackSelection = () => {
    const ta = document.querySelector(".editor-textarea") as HTMLTextAreaElement | null;
    if (!ta) return;
    setSelection({ start: ta.selectionStart, end: ta.selectionEnd });
  };

  const selectedText =
    selection.end > selection.start ? text.slice(selection.start, selection.end) : "";

  const handleApplyIssue = async (issue: GrammarIssue, replacement: string) => {
    const next = applyReplacement(text, issue, replacement);
    textRef.current = next;
    setText(next);
    setActiveIssueId(null);
    setSaveStatus("unsaved");
    await runGrammarCheck({ silent: true });
  };

  const handleIgnoreIssue = (issue: GrammarIssue) => {
    const nextIgnored = new Set(ignoredIds).add(issue.id);
    setIgnoredIds(nextIgnored);
    if (activeIssueId === issue.id) setActiveIssueId(null);
    if (tone) setTone(syncToneCounts(tone, issues, nextIgnored));
  };

  const handleAddToDictionary = (issue: GrammarIssue) => {
    const term = issue.problem?.trim();
    if (!term || term.startsWith("(")) return;
    const next = addToUserDictionary(term);
    setUserDictionary(next);
    const remaining = issues.filter((i) => !isIssueDictionarySuppressed(i, next));
    setIssues(remaining);
    if (tone) setTone(syncToneCounts(tone, remaining, ignoredIds));
    showToast(`Added "${term}" to your dictionary`, "success");
  };

  const handleSelectIssue = (issue: GrammarIssue) => {
    setActiveIssueId(issue.id);
    editorRef.current?.scrollToIssue(issue);
  };

  const handleCorrectAll = async () => {
    if (!visibleIssues.length) return;
    setCorrecting(true);
    try {
      const result = await api.checkGrammar(text, docId, userDictionary);
      if (result.corrected_text) {
        textRef.current = result.corrected_text;
        setText(result.corrected_text);
        setIssues([]);
        setIgnoredIds(new Set());
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
    } finally {
      setCorrecting(false);
    }
  };

  const handleRewrite = async (mode: ToneMode, label: string) => {
    const target = selectedText || text;
    if (!target.trim()) return;
    setRewriteLoading(true);
    try {
      const out = await api.rewrite(target, mode, docId);
      setAiPreview({ original: target, improved: out.rewritten_text, label });
      showToast(`${label} ready — review below`, "success");
    } catch {
      showToast("Rewrite failed — is the backend running?", "error");
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleEmailAction = async (action: string, label: string) => {
    const target = selectedText || text;
    if (!target.trim()) return;
    setRewriteLoading(true);
    try {
      const out = await api.improveEmail(target, action, docId);
      setAiPreview({ original: target, improved: out.rewritten_text, label });
      showToast(`${label} ready — review below`, "success");
    } catch {
      showToast("Email rewrite failed.", "error");
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleResumeAction = async (action: string, label: string) => {
    const target = selectedText || text;
    if (!target.trim()) return;
    setRewriteLoading(true);
    try {
      const out = await api.improveResume(target, action, docId);
      setAiPreview({
        original: target,
        improved: out.rewritten_text,
        label,
        action,
        kind: "resume",
      });
    } catch {
      showToast("Resume rewrite failed.", "error");
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleHealthcareAction = async (action: string, label: string) => {
    const target = selectedText || text;
    if (!target.trim()) return;
    setRewriteLoading(true);
    try {
      const out = await api.improveHealthcare(target, action, docId);
      setAiPreview({ original: target, improved: out.rewritten_text, label });
      showToast(`${label} ready — review below`, "success");
    } catch {
      showToast("Healthcare rewrite failed.", "error");
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleReplaceSelection = () => {
    if (!aiPreview) return;
    if (selection.end > selection.start) {
      setText(replaceSelection(text, selection.start, selection.end, aiPreview.improved));
    } else {
      setText(aiPreview.improved);
    }
    setAiPreview(null);
    void runGrammarCheck();
  };

  const handleCopyRewrite = async () => {
    if (aiPreview) await navigator.clipboard.writeText(aiPreview.improved);
  };

  const handleSave = useCallback(async () => {
    const title = docTitle.trim() || "Untitled Document";
    const content = textRef.current;
    if (!content.trim() && !title) {
      showToast("Nothing to save — add a title or some text first.", "info");
      return;
    }

    setSaving(true);
    setSaveStatus("saving");
    try {
      if (backendOnline) {
        const doc = await api.saveDocument(title, content, docId);
        setDocId(doc.id);
        setDocTitle(doc.title);
        saveLocalDraft(doc.title, content, doc.id);
        setSaveStatus("saved");
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
        saveLocalDraft(title, content, docId ?? undefined);
        setSaveStatus("saved");
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
      saveLocalDraft(title, content, docId ?? undefined);
      setSaveStatus("saved");
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
  }, [backendOnline, docTitle, docId, showToast, loadDocuments]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void runGrammarCheck({ mode: writingModeRef.current });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runGrammarCheck, handleSave]);

  const handleTextChange = (value: string) => {
    setText(value);
    setSaveStatus("unsaved");
    setLastEdited(new Date().toISOString());
  };

  const handleNewDoc = () => {
    grammarRequestId.current += 1;
    setDocId(null);
    setDocTitle("Untitled Document");
    setSaveStatus("unsaved");
    textRef.current = "";
    setText("");
    setIssues([]);
    setIgnoredIds(new Set());
    setTone(null);
    setAiPreview(null);
    didInitialCheck.current = false;
  };

  const applyModeSample = useCallback(
    (mode: WritingMode, options?: { silent?: boolean }) => {
      const info = MODE_INFO[mode];
      if (!info?.sampleText) return;

      if (checkTimer.current) {
        clearTimeout(checkTimer.current);
        checkTimer.current = null;
      }

      grammarRequestId.current += 1;
      toneRequestId.current += 1;
      didInitialCheck.current = false;

      const sample = info.sampleText;
      textRef.current = sample;
      writingModeRef.current = mode;

      flushSync(() => {
        setWritingMode(mode);
        setDocId(null);
        setDocTitle(info.sampleTitle);
        setSaveStatus("unsaved");
        setIssues([]);
        setIgnoredIds(new Set());
        setActiveIssueId(null);
        setAiPreview(null);
        setTone(null);
        setText(sample);
        setEditorSessionKey((k) => k + 1);
      });

      if (!options?.silent) {
        showToast(`${info.label} sample loaded — checking…`, "success");
      }
      void runGrammarCheck({ silent: false, mode });
    },
    [runGrammarCheck, showToast]
  );

  const handleModeChange = (mode: WritingMode) => {
    applyModeSample(mode, { silent: false });
    requestAnimationFrame(() => {
      rewritePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
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

  const handleDownloadText = () => {
    if (!text.trim()) {
      showToast("Nothing to download — add some text first.", "info");
      return;
    }
    const safeName = (docTitle.trim() || "smartwrite-draft").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    downloadTextFile(`${safeName}.txt`, text);
    showToast("Download started.", "success");
  };

  const handleSelectTemplate = (templateId: string) => {
    const t = getTemplate(templateId);
    if (!t) return;
    setWritingMode(t.mode);
    writingModeRef.current = t.mode;
    setDocTitle(t.title);
    setText(t.content);
    textRef.current = t.content;
    setIssues([]);
    setTone(null);
    setSaveStatus("unsaved");
    setEditorSessionKey((k) => k + 1);
    void runGrammarCheck({ silent: false, mode: t.mode });
    showToast(`Template loaded: ${t.title}`, "success");
  };

  const handleOpenHistory = (entry: HistoryEntry) => {
    setSidebarView("editor");
    setWritingMode(entry.mode);
    writingModeRef.current = entry.mode;
    setDocTitle(entry.title);
    setText(entry.content);
    textRef.current = entry.content;
    setIssues([]);
    setTone(null);
    setEditorSessionKey((k) => k + 1);
    void runGrammarCheck({ silent: true, mode: entry.mode });
  };

  const handleDeleteHistory = (id: string) => {
    deleteHistoryEntry(id);
    setHistory(loadHistory());
  };

  const improvedText = aiPreview?.improved ?? "";

  return (
    <div className="app">
      <BackendBanner online={backendOnline} apiUrl={apiBaseUrl} />
      <Toast messages={toasts} onDismiss={dismissToast} />
      <Header
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        backendOnline={backendOnline}
        onCheckGrammar={() => void runGrammarCheck({ mode: writingModeRef.current })}
        onCorrectAll={handleCorrectAll}
        onSave={handleSave}
        onClear={handleClearEditor}
        onCopy={handleCopyText}
        onDownload={handleDownloadText}
        onToggleSidebar={() => setMobileSidebar((o) => !o)}
        checking={checking}
        correcting={correcting}
        saving={saving}
        canCorrectAll={visibleIssues.some((i) => i.suggestion || i.replacements[0])}
        text={text}
        overallScore={tone?.writing_scores?.overall}
        modeLabel={MODE_INFO[writingMode].label}
        lastEdited={lastEdited}
      />

      <div className="app-body">
        <AppSidebar
          view={sidebarView}
          onViewChange={setSidebarView}
          writingMode={writingMode}
          onModeChange={handleModeChange}
          history={history}
          onOpenHistory={handleOpenHistory}
          onDeleteHistory={handleDeleteHistory}
          onSelectTemplate={handleSelectTemplate}
          onNewDoc={handleNewDoc}
          mobileOpen={mobileSidebar}
          onCloseMobile={() => setMobileSidebar(false)}
        />

        <div className="app-main-column">
          <main className="editor-main">
            <input
              className="doc-title-input"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Document title"
            />
            <WritingModeBar mode={writingMode} onLoadSample={applyModeSample} />
            {!text.trim() ? (
              <EmptyState
                icon="✎"
                title="Start writing"
                message="Paste your text or choose a template from the sidebar to get AI suggestions."
              />
            ) : null}
            <div onMouseUp={trackSelection} onKeyUp={trackSelection} className="editor-wrap">
              <WritingEditor
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
                selection={selection}
              />
            </div>
          </main>
        </div>

        <aside className="right-panel">
          <ScorePanel tone={tone} checking={checking || autoChecking} refreshing={toneRefreshing} />
          <section ref={rewritePanelRef}>
            <RewritePanel
              writingMode={writingMode}
              selectedText={selectedText}
              documentHasText={text.trim().length > 0}
              loading={rewriteLoading}
              onRewrite={handleRewrite}
              onEmailAction={handleEmailAction}
              onResumeAction={handleResumeAction}
              onHealthcareAction={handleHealthcareAction}
            />
          </section>
          <IssuesPanel
            issues={visibleIssues}
            activeIssueId={activeIssueId}
            checking={checking || autoChecking}
            writingMode={writingMode}
            onSelect={handleSelectIssue}
            onApply={handleApplyIssue}
            onIgnore={handleIgnoreIssue}
            onAddToDictionary={handleAddToDictionary}
          />
          {aiPreview && (
            <BeforeAfterPanel
              original={aiPreview.original}
              improved={improvedText}
              onReplace={handleReplaceSelection}
              onCopy={handleCopyRewrite}
              onDismiss={() => setAiPreview(null)}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
