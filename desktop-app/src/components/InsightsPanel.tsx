import { useEffect, useState } from "react";
import AgentCard from "./AgentCard";
import BeforeAfterPanel from "./BeforeAfterPanel";
import IssuesPanel from "./IssuesPanel";
import RewritePanel from "./RewritePanel";
import ScorePanel from "./ScorePanel";
import { AGENT_DEFINITIONS, TONE_AGENT_OPTIONS } from "../constants/agents";
import { MODE_INFO } from "../constants/modeConfig";
import { useAgent } from "../hooks/useAgent";
import type {
  AiRewritePreview,
  GrammarIssue,
  HistoryEntry,
  ToneMode,
  ToneResult,
  WritingMode,
} from "../types";
import "./InsightsPanel.css";

type InsightsTab = "suggestions" | "agents" | "history";

interface Props {
  tone: ToneResult | null;
  checking: boolean;
  toneRefreshing: boolean;
  issues: GrammarIssue[];
  activeIssueId: string | null;
  writingMode: WritingMode;
  onSelectIssue: (issue: GrammarIssue) => void;
  onApplyIssue: (issue: GrammarIssue, replacement: string) => void;
  onIgnoreIssue: (issue: GrammarIssue) => void;
  onAddToDictionary: (issue: GrammarIssue) => void;
  text: string;
  selectedText: string;
  documentId: number | null;
  onAgentApply: (original: string, rewrite: string, label: string) => void;
  aiPreview: AiRewritePreview | null;
  onReplacePreview: () => void;
  onCopyPreview: () => void;
  onDismissPreview: () => void;
  history: HistoryEntry[];
  onOpenHistory: (entry: HistoryEntry) => void;
  onDeleteHistory: (id: string) => void;
  rewriteLoading: boolean;
  onRewrite: (mode: ToneMode, label: string) => void;
  onEmailAction: (action: string, label: string) => void;
  onResumeAction: (action: string, label: string) => void;
  onHealthcareAction: (action: string, label: string) => void;
  rewritePanelRef?: React.RefObject<HTMLElement | null>;
}

function AgentSection({
  text,
  selectedText,
  documentId,
  onAgentApply,
}: {
  text: string;
  selectedText: string;
  documentId: number | null;
  onAgentApply: (original: string, rewrite: string, label: string) => void;
}) {
  const target = selectedText.trim() || text;
  const clarity = useAgent("clarity");
  const tone = useAgent("tone");
  const grader = useAgent("grader");
  const humanizer = useAgent("humanizer");
  const [toneChoice, setToneChoice] = useState<string>("Professional");

  const hooks = { clarity, tone, grader, humanizer };

  return (
    <div className="agents-section">
      {AGENT_DEFINITIONS.map((def) => {
        const hook = hooks[def.id];
        return (
          <AgentCard
            key={def.id}
            title={def.title}
            description={def.description}
            loading={hook.loading}
            result={hook.result}
            error={hook.error}
            onRun={() => {
              const opts = def.id === "tone" ? { tone: toneChoice } : {};
              void hook.run(target, opts, documentId);
            }}
            onApply={(rewrite) => onAgentApply(target, rewrite, def.title)}
            extraControls={
              def.id === "tone" ? (
                <label className="agent-tone-select">
                  Target tone
                  <select value={toneChoice} onChange={(e) => setToneChoice(e.target.value)}>
                    {TONE_AGENT_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}

export default function InsightsPanel({
  tone,
  checking,
  toneRefreshing,
  issues,
  activeIssueId,
  writingMode,
  onSelectIssue,
  onApplyIssue,
  onIgnoreIssue,
  onAddToDictionary,
  text,
  selectedText,
  documentId,
  onAgentApply,
  aiPreview,
  onReplacePreview,
  onCopyPreview,
  onDismissPreview,
  history,
  onOpenHistory,
  onDeleteHistory,
  rewriteLoading,
  onRewrite,
  onEmailAction,
  onResumeAction,
  onHealthcareAction,
  rewritePanelRef,
}: Props) {
  const [tab, setTab] = useState<InsightsTab>("suggestions");
  const scanning = checking || toneRefreshing;

  useEffect(() => {
    if (aiPreview) setTab("suggestions");
  }, [aiPreview]);

  return (
    <aside className="insights-panel right-panel">
      <ScorePanel tone={tone} checking={checking} refreshing={toneRefreshing} />

      <nav className="insights-tabs" aria-label="Insights sections">
        {(
          [
            ["suggestions", "Suggestions"],
            ["agents", "AI Agents"],
            ["history", "History"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "suggestions" && issues.length > 0 && (
              <span className="tab-count">{issues.length}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === "suggestions" && (
        <>
          <IssuesPanel
            issues={issues}
            activeIssueId={activeIssueId}
            checking={scanning}
            writingMode={writingMode}
            onSelect={onSelectIssue}
            onApply={onApplyIssue}
            onIgnore={onIgnoreIssue}
            onAddToDictionary={onAddToDictionary}
          />
          {aiPreview && (
            <BeforeAfterPanel
              original={aiPreview.original}
              improved={aiPreview.improved}
              onReplace={onReplacePreview}
              onCopy={onCopyPreview}
              onDismiss={onDismissPreview}
            />
          )}
        </>
      )}

      {tab === "agents" && (
        <div className="insights-scroll" ref={rewritePanelRef as React.RefObject<HTMLDivElement>}>
          <RewritePanel
            writingMode={writingMode}
            selectedText={selectedText}
            documentHasText={text.trim().length > 0}
            loading={rewriteLoading}
            onRewrite={onRewrite}
            onEmailAction={onEmailAction}
            onResumeAction={onResumeAction}
            onHealthcareAction={onHealthcareAction}
          />
          <AgentSection
            text={text}
            selectedText={selectedText}
            documentId={documentId}
            onAgentApply={onAgentApply}
          />
        </div>
      )}

      {tab === "history" && (
        <div className="insights-history insights-scroll">
          {history.length === 0 && (
            <p className="insights-empty">No saved drafts yet. Click Save to add history.</p>
          )}
          {history.map((h) => (
            <div key={h.id} className="insights-history-item">
              <button type="button" onClick={() => onOpenHistory(h)}>
                <strong>{h.title}</strong>
                <span>
                  {MODE_INFO[h.mode].label} · Score {h.score}
                </span>
                <span className="history-preview">{h.preview}…</span>
              </button>
              <button
                type="button"
                className="history-del"
                onClick={() => onDeleteHistory(h.id)}
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
