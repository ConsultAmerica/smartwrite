import { useEffect, useRef, useState } from "react";
import type { GrammarIssue, ToneResult, WritingMode } from "../types";
import {
  clarityLabel,
  correctnessLabel,
  engagementLabel,
  scoreDots,
  suggestionBucket,
  toneDimensionLabel,
  type SuggestionBucket,
} from "../services/scoring";
import { nearbyWords } from "../utils/textContext";
import "./IssuesPanel.css";

type FilterId = "all" | SuggestionBucket;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "correctness", label: "Correctness" },
  { id: "clarity", label: "Clarity" },
  { id: "tone", label: "Tone" },
  { id: "style", label: "Style" },
];

interface Props {
  issues: GrammarIssue[];
  activeIssueId: string | null;
  checking: boolean;
  writingMode?: WritingMode;
  tone?: ToneResult | null;
  hasText?: boolean;
  /** Full document text — used for whitespace context snippets. */
  documentText?: string;
  onSelect: (issue: GrammarIssue) => void;
  onApply: (issue: GrammarIssue, replacement: string) => void;
  onIgnore: (issue: GrammarIssue) => void;
  onAddToDictionary: (issue: GrammarIssue) => void;
}

function bucketLabel(bucket: SuggestionBucket): string {
  return bucket.toUpperCase();
}

function canAddToDictionary(issue: GrammarIssue): boolean {
  const t = issue.issue_type.toLowerCase();
  const rid = issue.rule_id.toUpperCase();
  if (t === "spelling" || issue.category === "spelling") return true;
  if (rid.includes("SPELL") || rid.includes("MORFOLOGIK")) return true;
  return false;
}

function originalLabel(issue: GrammarIssue): string {
  if (issue.length === 0 && issue.issue_type === "punctuation") {
    return "Missing period at end of text";
  }
  return issue.problem || "…";
}

function isWhitespaceFocused(issue: GrammarIssue, suggestion: string): boolean {
  const problem = issue.problem ?? "";
  const blob = `${issue.message} ${issue.short_message} ${issue.issue_title} ${issue.rule_id}`;
  if (/extra\s*space|whitespace|double\s*space|too many spaces/i.test(blob)) return true;
  if (problem.length > 0 && /^\s+$/.test(problem)) return true;
  if (suggestion.length >= 0 && problem.length > 0 && /^\s*$/.test(problem) && /^\s*$/.test(suggestion)) {
    return true;
  }
  // Multiple spaces collapsing to fewer spaces
  if (/\s{2,}/.test(problem) && suggestion.replace(/\s+/g, " ").trim() === suggestion.trim()) {
    return / {2,}|\t/.test(problem);
  }
  return false;
}

function WhitespaceDiff({
  issue,
  suggestion,
  documentText = "",
}: {
  issue: GrammarIssue;
  suggestion: string;
  documentText?: string;
}) {
  const problem = issue.problem || "  ";
  const left = nearbyWords(documentText, issue.offset, issue.length, "before", 2);
  const right = nearbyWords(documentText, issue.offset, issue.length, "after", 2);

  return (
    <div className="issue-diff issue-diff-ws" aria-label="Suggested spacing change">
      <p className="issue-ws-line">
        {left ? <span className="issue-ws-ctx">{left} </span> : null}
        <span className="issue-ws-mark bad" title="Extra space">
          {problem.replace(/ /g, "·") || "··"}
        </span>
        {right ? <span className="issue-ws-ctx"> {right}</span> : null}
      </p>
      <span className="issue-change-label">Suggested</span>
      <p className="issue-ws-line">
        {left ? <span className="issue-ws-ctx">{left} </span> : null}
        <span className={`issue-ws-mark ${suggestion ? "ok" : "bad"}`}>
          {suggestion === "" ? "∅" : suggestion.replace(/ /g, "·") || "·"}
        </span>
        {right ? <span className="issue-ws-ctx"> {right}</span> : null}
      </p>
    </div>
  );
}

export default function IssuesPanel({
  issues,
  activeIssueId,
  checking,
  writingMode = "general",
  tone = null,
  hasText = false,
  documentText = "",
  onSelect,
  onApply,
  onIgnore,
  onAddToDictionary,
}: Props) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!activeIssueId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-issue-id="${activeIssueId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIssueId]);

  const counts = {
    all: issues.length,
    correctness: issues.filter((i) => suggestionBucket(i) === "correctness").length,
    clarity: issues.filter((i) => suggestionBucket(i) === "clarity").length,
    tone: issues.filter((i) => suggestionBucket(i) === "tone").length,
    style: issues.filter((i) => suggestionBucket(i) === "style").length,
  };

  const filtered = issues.filter(
    (i) => filter === "all" || suggestionBucket(i) === filter
  );

  const handleAccept = (issue: GrammarIssue, suggestion: string) => {
    setExitingIds((prev) => new Set(prev).add(issue.id));
    window.setTimeout(() => {
      onApply(issue, suggestion);
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(issue.id);
        return next;
      });
    }, 180);
  };

  const handleDismiss = (issue: GrammarIssue) => {
    setExitingIds((prev) => new Set(prev).add(issue.id));
    window.setTimeout(() => {
      onIgnore(issue);
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(issue.id);
        return next;
      });
    }, 180);
  };

  return (
    <section className="issues-panel">
      <div className="issues-panel-head">
        <h3>
          Suggestions <span className="issues-count">{issues.length}</span>
        </h3>
        {checking && (
          <span className="check-badge" role="status" aria-live="polite">
            Checking your writing…
          </span>
        )}
      </div>

      <div className="issue-filters" role="tablist" aria-label="Suggestion categories">
        {FILTERS.map((f) => {
          const count = counts[f.id];
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${isActive ? "active" : ""}${count === 0 && !isActive ? " is-zero" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {count > 0 ? <span className="filter-count">{count}</span> : null}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && !checking && issues.length === 0 && !hasText && (
        <div className="suggestions-ready">
          <strong>Ready when you are</strong>
          <p>
            Start writing and SmartWrite will analyze correctness, clarity, tone, and style.
          </p>
        </div>
      )}

      {filtered.length === 0 && !checking && issues.length === 0 && hasText && (
        <div className="suggestions-healthy">
          <div className="suggestions-healthy-copy">
            <strong>No suggestions right now</strong>
            <p>Your writing looks clear. SmartWrite will continue checking as you write.</p>
          </div>
          <ul className="suggestions-healthy-scores">
            {(() => {
              const correctness = tone?.writing_scores?.grammar ?? tone?.grammar_score;
              const clarity = tone?.writing_scores?.clarity ?? tone?.clarity_score;
              const toneScore = tone?.writing_scores?.tone ?? tone?.professionalism_score;
              const engagement = tone?.writing_scores?.readability;
              return [
                {
                  label: "Correctness",
                  display: correctness != null ? correctnessLabel(correctness) : "—",
                  dots: correctness != null ? scoreDots(correctness) : null,
                },
                {
                  label: "Clarity",
                  display: clarity != null ? clarityLabel(clarity) : "—",
                  dots: clarity != null ? scoreDots(clarity) : null,
                },
                {
                  label: "Tone",
                  display:
                    tone != null
                      ? toneDimensionLabel(tone.tone, toneScore, writingMode)
                      : "—",
                  dots: null as string | null,
                },
                {
                  label: "Engagement",
                  display: engagement != null ? engagementLabel(engagement) : "—",
                  dots: engagement != null ? scoreDots(engagement) : null,
                },
              ];
            })().map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                <strong>{row.display}</strong>
                {row.dots && (
                  <span className="healthy-dots" aria-hidden="true">
                    {row.dots}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {filtered.length === 0 && !checking && issues.length > 0 && (
        <p className="empty muted">No suggestions in this category.</p>
      )}

      {filtered.length === 0 && checking && (
        <p className="empty muted shimmer-line">Checking your writing…</p>
      )}

      <ul ref={listRef} className={`issues-list${checking ? " is-checking" : ""}`}>
        {[...filtered]
          .sort((a, b) => a.offset - b.offset)
          .map((issue) => {
            const suggestion = issue.suggestion || issue.replacements[0] || "";
            const bucket = suggestionBucket(issue);
            const canApply = Boolean(suggestion);
            const exiting = exitingIds.has(issue.id);

            return (
              <li
                key={issue.id}
                data-issue-id={issue.id}
                className={`issue-card bucket-${bucket}${activeIssueId === issue.id ? " active" : ""}${exiting ? " exiting" : ""}`}
                tabIndex={0}
                role="button"
                aria-pressed={activeIssueId === issue.id}
                onClick={() => onSelect(issue)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(issue);
                  }
                }}
              >
                <span className={`issue-type ${bucket}`}>{bucketLabel(bucket)}</span>
                <p className="issue-message">
                  {issue.issue_title || issue.short_message || issue.message || issue.why}
                </p>

                {isWhitespaceFocused(issue, suggestion) ? (
                  <WhitespaceDiff
                    issue={issue}
                    suggestion={suggestion}
                    documentText={documentText}
                  />
                ) : (
                  <div className="issue-diff">
                    <p className="issue-original">“{originalLabel(issue)}”</p>
                    {suggestion ? (
                      <>
                        <span className="issue-change-label">Suggested</span>
                        <p className="issue-suggestion">“{suggestion}”</p>
                      </>
                    ) : null}
                  </div>
                )}

                {issue.why && <p className="issue-why">{issue.why}</p>}

                <div className="issue-actions">
                  {canApply && (
                    <button
                      type="button"
                      className="issue-btn apply"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(issue, suggestion);
                      }}
                    >
                      Accept
                    </button>
                  )}
                  <button
                    type="button"
                    className="issue-btn ignore"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(issue);
                    }}
                  >
                    Dismiss
                  </button>
                  {canAddToDictionary(issue) && (
                    <button
                      type="button"
                      className="issue-btn dictionary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToDictionary(issue);
                      }}
                    >
                      Dictionary
                    </button>
                  )}
                </div>
              </li>
            );
          })}
      </ul>

      {hasText && filtered.length > 0 && filtered.length <= 2 && (
        <ul className="suggestions-mini-insights" aria-label="Quick insights">
          {(() => {
            const correctness = tone?.writing_scores?.grammar ?? tone?.grammar_score;
            const clarity = tone?.writing_scores?.clarity ?? tone?.clarity_score;
            const toneScore = tone?.writing_scores?.tone ?? tone?.professionalism_score;
            return [
              {
                label: "Correctness",
                value: correctness != null ? correctnessLabel(correctness) : "—",
              },
              {
                label: "Clarity",
                value: clarity != null ? clarityLabel(clarity) : "—",
              },
              {
                label: "Tone",
                value: toneDimensionLabel(tone?.tone, toneScore, writingMode),
              },
            ];
          })().map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
