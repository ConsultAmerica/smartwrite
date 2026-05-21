import { useState } from "react";
import type { GrammarIssue } from "../types";
import "./IssuesPanel.css";

interface Props {
  issues: GrammarIssue[];
  activeIssueId: string | null;
  checking: boolean;
  onSelect: (issue: GrammarIssue) => void;
  onApply: (issue: GrammarIssue, replacement: string) => void;
  onIgnore: (issue: GrammarIssue) => void;
  onAddToDictionary: (issue: GrammarIssue) => void;
}

function categoryLabel(issue: GrammarIssue): string {
  const title = issue.issue_title || issue.category || "Grammar";
  return title.toUpperCase();
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
  onSelect,
  onApply,
  onIgnore,
  onAddToDictionary,
}: Props) {
  const [explainedId, setExplainedId] = useState<string | null>(null);

  return (
    <section className="issues-panel">
      <div className="issues-panel-head">
        <h3>Issues {issues.length > 0 ? `(${issues.length})` : ""}</h3>
        {checking && <span className="check-badge">Checking…</span>}
      </div>

      {issues.length === 0 && !checking && (
        <p className="empty success-empty">
          No issues found — writing looks clean. Keep editing or run Check Grammar after changes.
        </p>
      )}

      {issues.length === 0 && checking && (
        <p className="empty muted">Scanning for grammar issues…</p>
      )}

      <ul className={`issues-list ${checking ? "is-checking" : ""}`}>
        {[...issues]
          .sort((a, b) => a.offset - b.offset)
          .map((issue) => {
          const suggestion = issue.suggestion || issue.replacements[0] || "";
          const showExplain = explainedId === issue.id;
          const canApply = Boolean(suggestion) && issue.issue_type !== "clarity";

          return (
            <li
              key={issue.id}
              className={`issue-card ${activeIssueId === issue.id ? "active" : ""}`}
              onClick={() => onSelect(issue)}
            >
              <span className={`issue-type ${issue.issue_type || issue.category}`}>
                {categoryLabel(issue)}
              </span>

              <div className="issue-detail">
                <p className="issue-row">
                  <span className="issue-row-label">Original:</span>
                  <span className="issue-row-value original">{originalLabel(issue)}</span>
                </p>
                {suggestion && (
                  <p className="issue-row">
                    <span className="issue-row-label">Suggestion:</span>
                    <span className="issue-row-value suggestion">{suggestion}</span>
                  </p>
                )}
                <p className="issue-row">
                  <span className="issue-row-label">Explanation:</span>
                  <span className="issue-row-value">{issue.why}</span>
                </p>
              </div>

              {showExplain && (
                <p className="issue-explain">{issue.message || issue.why}</p>
              )}

              <div className="issue-actions">
                {canApply && (
                  <button
                    type="button"
                    className="issue-btn apply"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApply(issue, suggestion);
                    }}
                  >
                    Apply
                  </button>
                )}
                <button
                  type="button"
                  className="issue-btn ignore"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIgnore(issue);
                  }}
                >
                  Ignore
                </button>
                <button
                  type="button"
                  className="issue-btn explain"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExplainedId(showExplain ? null : issue.id);
                  }}
                >
                  Explain
                </button>
                <button
                  type="button"
                  className="issue-btn dictionary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToDictionary(issue);
                  }}
                >
                  Add to Dictionary
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
