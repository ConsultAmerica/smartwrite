import { useEffect, useState } from "react";
import IssueList from "./IssueList";
import ScoreCard from "./ScoreCard";
import { formatWordCount, getTextStats } from "../utils/textStats";
import {
  clarityLabel,
  correctnessLabel,
  engagementLabel,
  scoreDots,
  scoreLevel,
  toneDimensionLabel,
} from "../services/scoring";
import type {
  GrammarIssue,
  ToneMode,
  ToneResult,
  WritingMode,
} from "../types";
import type { WritingGoals } from "../constants/writingGoals";
import "./InsightsPanel.css";

type InsightsTab = "suggestions" | "insights";

interface Props {
  tone: ToneResult | null;
  checking: boolean;
  toneRefreshing: boolean;
  issues: GrammarIssue[];
  activeIssueId: string | null;
  writingMode: WritingMode;
  writingGoals?: WritingGoals;
  onSelectIssue: (issue: GrammarIssue) => void;
  onApplyIssue: (issue: GrammarIssue, replacement: string) => void;
  onIgnoreIssue: (issue: GrammarIssue) => void;
  onAddToDictionary: (issue: GrammarIssue) => void;
  text: string;
  selectedText: string;
  documentId: number | null;
  onAgentApply: (original: string, rewrite: string, label: string) => void;
  onToneAdjust?: (mode: ToneMode, label: string) => void;
  focusAgentsTab?: boolean;
  onAgentsTabFocused?: () => void;
  preferredTab?: InsightsTab;
  onAskSmartWrite?: () => void;
}

const ASK_SUGGESTIONS: Array<{ mode: ToneMode; label: string }> = [
  { mode: "clearer", label: "Improve this document" },
  { mode: "shorter", label: "Summarize" },
  { mode: "shorter", label: "Make more concise" },
  { mode: "professional", label: "Make more professional" },
  { mode: "clarity", label: "Find unclear sections" },
];

function avgSentenceLength(words: number, sentences: number): number {
  if (!words || !sentences) return 0;
  return Math.round(words / Math.max(1, sentences));
}

function vocabLabel(text: string): string {
  const tokens = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (tokens.length < 8) return "—";
  const unique = new Set(tokens).size;
  const ratio = unique / tokens.length;
  if (ratio > 0.72) return "Varied";
  if (ratio > 0.5) return "Balanced";
  return "Repetitive";
}

function readabilityLabel(score: number | null | undefined, avgLen: number): string {
  if (score == null && !avgLen) return "—";
  if (avgLen > 0 && avgLen <= 14) return "Easy to read";
  if (avgLen <= 20) return "Clear";
  if (score != null && score >= 78) return "Good";
  return "Dense";
}

function InsightsMetrics({
  tone,
  text,
  writingMode,
  writingGoals,
}: {
  tone: ToneResult | null;
  text: string;
  writingMode: WritingMode;
  writingGoals?: WritingGoals;
}) {
  const stats = getTextStats(text);
  const scores = tone?.writing_scores;
  const hasText = text.trim().length > 0;
  const avgLen = avgSentenceLength(stats.words, stats.sentences);
  const toneName = toneDimensionLabel(tone?.tone, scores?.tone ?? tone?.professionalism_score, writingMode);

  if (!hasText) {
    return (
      <div className="insights-metrics">
        <p className="insights-empty-note">Insights appear once you start writing.</p>
      </div>
    );
  }

  return (
    <div className="insights-metrics">
      <section className="insights-block">
        <h4>Document</h4>
        <ul className="insights-kv">
          <li>
            <span>{formatWordCount(stats.words)}</span>
          </li>
          <li>
            <span>{stats.sentences} sentences</span>
          </li>
          <li>
            <span>{stats.readingLabel} read</span>
          </li>
        </ul>
      </section>

      <section className="insights-block">
        <h4>Readability</h4>
        <p>{readabilityLabel(scores?.readability, avgLen)}</p>
      </section>

      <section className="insights-block">
        <h4>Tone</h4>
        <p>
          {toneName}
          {tone?.tone && toneName !== tone.tone ? ` · ${tone.tone}` : ""}
        </p>
      </section>

      <section className="insights-block">
        <h4>Sentence length</h4>
        <p>
          {avgLen > 0
            ? `${avgLen} ${avgLen === 1 ? "word" : "words"} average`
            : "—"}
        </p>
      </section>

      <section className="insights-block">
        <h4>Vocabulary</h4>
        <p>{vocabLabel(text)}</p>
      </section>

      <section className="insights-block">
        <h4>Goals</h4>
        <ul className="insights-kv">
          <li>
            <span>
              {(writingGoals?.documentType || writingMode)
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </li>
          <li>
            <span>
              {(writingGoals?.formality || "formal").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </li>
          <li>
            <span>
              {(writingGoals?.intent || "inform")
                .replace("inform", "Informative")
                .replace("persuade", "Persuasive")
                .replace("explain", "Explanatory")
                .replace("request", "Request")}
            </span>
          </li>
        </ul>
      </section>

      <section className="insights-block insights-block-scores">
        <h4>Dimensions</h4>
        <ul className="insights-score-rows">
          {[
            {
              label: "Correctness",
              display:
                scores?.grammar != null || tone?.grammar_score != null
                  ? correctnessLabel(scores?.grammar ?? tone!.grammar_score)
                  : "—",
              value: scores?.grammar ?? tone?.grammar_score,
            },
            {
              label: "Clarity",
              display:
                scores?.clarity != null || tone?.clarity_score != null
                  ? clarityLabel(scores?.clarity ?? tone!.clarity_score)
                  : "—",
              value: scores?.clarity ?? tone?.clarity_score,
            },
            {
              label: "Engagement",
              display:
                scores?.readability != null ? engagementLabel(scores.readability) : "—",
              value: scores?.readability,
            },
          ].map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <span className={row.value != null ? `score-level-${scoreLevel(row.value)}` : "muted"}>
                {row.display}
              </span>
              {row.value != null && (
                <span className="insights-dots" aria-hidden="true">
                  {scoreDots(row.value)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
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
  writingGoals,
  onSelectIssue,
  onApplyIssue,
  onIgnoreIssue,
  onAddToDictionary,
  text,
  onToneAdjust,
  focusAgentsTab,
  onAgentsTabFocused,
  preferredTab,
  onAskSmartWrite,
}: Props) {
  const [tab, setTab] = useState<InsightsTab>(
    preferredTab === "insights" ? "insights" : "suggestions"
  );
  const [askOpen, setAskOpen] = useState(false);
  const [askText, setAskText] = useState("");
  const scanning = checking || toneRefreshing;
  const hasText = text.trim().length > 0;
  const wordCount = getTextStats(text).words;

  useEffect(() => {
    if (preferredTab === "suggestions" || preferredTab === "insights") {
      setTab(preferredTab);
    }
  }, [preferredTab]);

  useEffect(() => {
    if (focusAgentsTab) {
      setTab("insights");
      setAskOpen(true);
      onAgentsTabFocused?.();
    }
  }, [focusAgentsTab, onAgentsTabFocused]);

  useEffect(() => {
    if (activeIssueId) setTab("suggestions");
  }, [activeIssueId]);

  return (
    <aside className="insights-panel" aria-label="Suggestions and insights">
      <ScoreCard
        tone={tone}
        checking={scanning}
        compact
        issueCount={issues.length}
        hasText={hasText}
        wordCount={wordCount}
      />

      <nav className="insights-tabs" aria-label="Panel views">
        {(
          [
            ["suggestions", "Suggestions"],
            ["insights", "Insights"],
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

      <div className="insights-body">
        {tab === "suggestions" && (
          <IssueList
            issues={issues}
            activeIssueId={activeIssueId}
            checking={scanning}
            writingMode={writingMode}
            tone={tone}
            hasText={hasText}
            onSelect={onSelectIssue}
            onApply={onApplyIssue}
            onIgnore={onIgnoreIssue}
            onAddToDictionary={onAddToDictionary}
          />
        )}

        {tab === "insights" && (
          <InsightsMetrics
            tone={tone}
            text={text}
            writingMode={writingMode}
            writingGoals={writingGoals}
          />
        )}
      </div>

      <div className={`insights-ask${askOpen ? " open" : ""}`}>
        <button
          type="button"
          className="insights-ask-toggle"
          onClick={() => setAskOpen((v) => !v)}
          aria-expanded={askOpen}
        >
          <strong>Ask SmartWrite</strong>
          <em>Ask about this document…</em>
        </button>

        {askOpen && (
          <div className="insights-ask-panel">
            <p className="insights-ask-label">Suggested actions</p>
            <ul className="insights-ask-suggestions">
              {ASK_SUGGESTIONS.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      onToneAdjust?.(item.mode, item.label);
                      onAskSmartWrite?.();
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="insights-ask-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!askText.trim()) return;
                onToneAdjust?.("clearer", askText.trim());
                onAskSmartWrite?.();
                setAskText("");
              }}
            >
              <input
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                placeholder="Ask SmartWrite about this document…"
                aria-label="Ask SmartWrite about this document"
              />
              <button type="submit" aria-label="Send" disabled={!askText.trim()}>
                →
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
