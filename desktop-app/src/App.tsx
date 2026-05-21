import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import AiRewritePanel from "./components/AiRewritePanel";
import DocumentsSidebar from "./components/DocumentsSidebar";
import Header from "./components/Header";
import IssuesPanel from "./components/IssuesPanel";
import RewritePanel from "./components/RewritePanel";
import TonePanel from "./components/TonePanel";
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
  Document,
  GrammarIssue,
  SaveStatus,
  Theme,
  ToneMode,
  ToneResult,
  WritingMode,
} from "./types";
import { detectModeFromContent, MODE_INFO } from "./constants/modeConfig";
import { DEMO_SAMPLE_TEXT } from "./constants/demoText";
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

export default function App() {
  const editorRef = useRef<WritingEditorHandle>(null);
  const textRef = useRef(DEMO_SAMPLE_TEXT);
  const grammarRequestId = useRef(0);
  const toneRequestId = useRef(0);
  const didInitialCheck = useRef(false);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("smartwrite-theme");
    return (saved as Theme) || "dark";
  });
  const [text, setText] = useState(DEMO_SAMPLE_TEXT);
  const [writingMode, setWritingMode] = useState<WritingMode>("healthcare");
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docId, setDocId] = useState<number | null>(null);
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("unsaved");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [userDictionary, setUserDictionary] = useState<string[]>(() => loadUserDictionary());
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewritePanelRef = useRef<HTMLElement>(null);
  const [editorSessionKey, setEditorSessionKey] = useState(0);
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
        summary: api.buildWritingSummary(count, base.grammar_score),
      };
    },
    [applyIssueFilters]
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
      let { documents: docs } = await api.listDocuments();
      if (docs.length === 0) {
        try {
          const seeded = await api.seedSampleDocuments();
          docs = seeded.documents;
        } catch {
          /* seed optional */
        }
      }
      setDocuments(docs);
    } catch {
      /* offline — app still works without saved docs */
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
    async (options?: { silent?: boolean }) => {
      const content = textRef.current;
      if (!content.trim()) return;

      const requestId = ++grammarRequestId.current;
      const silent = options?.silent ?? false;

      if (!silent) setChecking(true);
      else setAutoChecking(true);

      try {
        const result = await api.checkGrammar(content, docId, userDictionary);
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
          visibleCount
        );
        setTone(scores);

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
    [docId, tone?.tone, userDictionary, ignoredIds, applyIssueFilters, syncToneCounts, showToast]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void runGrammarCheck();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runGrammarCheck]);

  // Initial check when backend comes online
  useEffect(() => {
    if (backendOnline && !didInitialCheck.current && textRef.current.length > 10) {
      didInitialCheck.current = true;
      void runGrammarCheck({ silent: true });
    }
  }, [backendOnline, runGrammarCheck]);

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
      setAiPreview({ original: target, improved: out.rewritten_text, label });
      showToast(`${label} ready — review below`, "success");
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

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("saving");
    try {
      const doc = await api.saveDocument(docTitle, text, docId);
      setDocId(doc.id);
      setDocTitle(doc.title);
      setSaveStatus("saved");
      await loadDocuments();
    } catch {
      setSaveStatus("unsaved");
      alert("Save failed — is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    setSaveStatus("unsaved");
  };

  const handleNewDoc = () => {
    grammarRequestId.current += 1;
    setDocId(null);
    setDocTitle("Untitled Document");
    setSaveStatus("unsaved");
    setText("");
    setIssues([]);
    setIgnoredIds(new Set());
    setTone(null);
    setAiPreview(null);
    didInitialCheck.current = false;
  };

  const handleSelectDoc = (doc: Document) => {
    grammarRequestId.current += 1;
    setDocId(doc.id);
    setDocTitle(doc.title);
    textRef.current = doc.content;
    setText(doc.content);
    setEditorSessionKey((k) => k + 1);
    const detected = detectModeFromContent(doc.content, doc.title);
    if (detected) setWritingMode(detected);
    setIssues([]);
    setIgnoredIds(new Set());
    setAiPreview(null);
    didInitialCheck.current = false;
    if (backendOnline && doc.content.length > 10) {
      setTimeout(() => void runGrammarCheck({ silent: true }), 100);
    }
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

      if (backendOnline) {
        void runGrammarCheck({ silent: false });
      } else if (!options?.silent) {
        showToast("Sample loaded — start backend to run grammar check.", "info");
      }

      if (!options?.silent) {
        showToast(`${info.label} sample loaded`, "success");
      }
    },
    [backendOnline, runGrammarCheck, showToast]
  );

  const handleModeChange = (mode: WritingMode) => {
    applyModeSample(mode, { silent: false });
    requestAnimationFrame(() => {
      rewritePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await api.deleteDocument(id);
      if (docId === id) handleNewDoc();
      await loadDocuments();
    } catch {
      alert("Delete failed.");
    }
  };

  return (
    <div className="app">
      <BackendBanner online={backendOnline} apiUrl={apiBaseUrl} />
      <Toast messages={toasts} onDismiss={dismissToast} />
      <Header
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        writingMode={writingMode}
        onModeChange={handleModeChange}
        backendOnline={backendOnline}
        onCheckGrammar={() => void runGrammarCheck()}
        onCorrectAll={handleCorrectAll}
        onSave={handleSave}
        checking={checking}
        correcting={correcting}
        saving={saving}
        canCorrectAll={visibleIssues.some((i) => i.suggestion || i.replacements[0])}
      />

      <div className="app-body">
        <DocumentsSidebar
          documents={documents}
          activeId={docId}
          onSelect={handleSelectDoc}
          onNew={handleNewDoc}
          onDelete={handleDeleteDoc}
        />

        <main className="editor-main">
          <input
            className="doc-title-input"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Document title"
          />
          <WritingModeBar mode={writingMode} onLoadSample={applyModeSample} />
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

        <aside className="right-panel">
          <TonePanel tone={tone} refreshing={toneRefreshing || autoChecking} />
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
            onSelect={handleSelectIssue}
            onApply={handleApplyIssue}
            onIgnore={handleIgnoreIssue}
            onAddToDictionary={handleAddToDictionary}
          />
          <AiRewritePanel
            preview={aiPreview}
            loading={rewriteLoading}
            onReplace={handleReplaceSelection}
            onCopy={handleCopyRewrite}
            onDismiss={() => setAiPreview(null)}
          />
        </aside>
      </div>
    </div>
  );
}
