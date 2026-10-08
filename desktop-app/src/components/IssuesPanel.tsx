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

export default function IssuesPanel({
  issues,
  activeIssueId,
  checking,
  writingMode = "general",
  tone = null,
  hasText = false,
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
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? "active" : ""}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="filter-count">{counts[f.id]}</span>
          </button>
        ))}
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
                  display: correctness != null ? correctnessLabel(correctness) : "Strong",
                  dots: scoreDots(correctness ?? 90),
                },
                {
                  label: "Clarity",
                  display: clarity != null ? clarityLabel(clarity) : "Clear",
                  dots: scoreDots(clarity ?? 86),
                },
                {
                  label: "Tone",
                  display: toneDimensionLabel(tone?.tone, toneScore, writingMode),
                  dots: null as string | null,
                },
                {
                  label: "Engagement",
                  display: engagement != null ? engagementLabel(engagement) : "Moderate",
                  dots: scoreDots(engagement ?? 72),
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

                <div className="issue-diff">
                  <p className="issue-original">“{originalLabel(issue)}”</p>
                  {suggestion && (
                    <>
                      <span className="issue-change-label">Suggested</span>
                      <p className="issue-suggestion">“{suggestion}”</p>
                    </>
                  )}
                </div>

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
    </section>
  );
}
