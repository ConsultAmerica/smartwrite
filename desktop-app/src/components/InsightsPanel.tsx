import { useEffect, useState } from "react";
import AgentCard from "./AgentCard";
import BeforeAfterPanel from "./BeforeAfterPanel";
import HistoryPanel from "./HistoryPanel";
import IssueList from "./IssueList";
import ScoreCard from "./ScoreCard";
import { AGENT_DEFINITIONS, TONE_AGENT_OPTIONS } from "../constants/agents";
import { useAgent } from "../hooks/useAgent";
import type {
  AiRewritePreview,
  GrammarIssue,
  HistoryEntry,
  ToneResult,
  WritingMode,
} from "../types";
import "./InsightsPanel.css";

type InsightsTab = "issues" | "agents" | "history";

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
  focusAgentsTab?: boolean;
  onAgentsTabFocused?: () => void;
}

const AGENT_CTA: Record<string, string> = {
  clarity: "Improve Clarity",
  tone: "Adjust Tone",
  grader: "Grade Writing",
  humanizer: "Humanize Text",
};

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
            runLabel={AGENT_CTA[def.id]}
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
  focusAgentsTab,
  onAgentsTabFocused,
}: Props) {
  const [tab, setTab] = useState<InsightsTab>("issues");
  const scanning = checking || toneRefreshing;

  useEffect(() => {
    if (aiPreview) setTab("issues");
  }, [aiPreview]);

  useEffect(() => {
    if (focusAgentsTab) {
      setTab("agents");
      onAgentsTabFocused?.();
    }
  }, [focusAgentsTab, onAgentsTabFocused]);

  return (
    <aside className="insights-panel">
      <ScoreCard tone={tone} checking={scanning} />

      <nav className="insights-tabs" aria-label="Insights sections">
        {(
          [
            ["issues", "Issues"],
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
            {id === "issues" && issues.length > 0 && <span className="tab-count">{issues.length}</span>}
          </button>
        ))}
      </nav>

      <div className="insights-body">
        {tab === "issues" && (
          <>
            <IssueList
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
          <AgentSection
            text={text}
            selectedText={selectedText}
            documentId={documentId}
            onAgentApply={onAgentApply}
          />
        )}

        {tab === "history" && (
          <HistoryPanel
            history={history}
            onOpen={onOpenHistory}
            onDelete={onDeleteHistory}
            onRestore={onOpenHistory}
          />
        )}
      </div>
    </aside>
  );
}
