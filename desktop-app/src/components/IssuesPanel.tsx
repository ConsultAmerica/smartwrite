import { useState } from "react";
import type { GrammarIssue, SuggestionCategory, WritingMode } from "../types";
import { issueCategory } from "../services/scoring";
import EmptyState from "./EmptyState";
import "./IssuesPanel.css";

const CATEGORIES: { id: SuggestionCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "grammar", label: "Grammar" },
  { id: "spelling", label: "Spelling" },
  { id: "punctuation", label: "Punctuation" },
  { id: "clarity", label: "Clarity" },
  { id: "tone", label: "Tone" },
  { id: "conciseness", label: "Conciseness" },
  { id: "vocabulary", label: "Vocabulary" },
  { id: "professionalism", label: "Professional" },
];

interface Props {
  issues: GrammarIssue[];
  activeIssueId: string | null;
  checking: boolean;
  writingMode?: WritingMode;
  onSelect: (issue: GrammarIssue) => void;
  onApply: (issue: GrammarIssue, replacement: string) => void;
  onIgnore: (issue: GrammarIssue) => void;
  onAddToDictionary: (issue: GrammarIssue) => void;
}

function categoryLabel(issue: GrammarIssue): string {
  const title = issue.issue_title || issue.category || "Grammar";
  return title.toUpperCase();
}

/** Dictionary applies only to spelling / domain-word false positives. */
function canAddToDictionary(issue: GrammarIssue): boolean {
  const t = issue.issue_type.toLowerCase();
  const rid = issue.rule_id.toUpperCase();
  if (t === "spelling" || issue.category === "spelling") return true;
  if (rid.includes("SPELL") || rid.includes("MORFOLOGIK")) return true;
  return false;
}

const EMPTY_MSG: Partial<Record<WritingMode, string>> & { default: string } = {
  general: "Great work. No major issues found — you can still improve tone or conciseness.",
  email: "No email issues flagged — tone looks professional.",
  resume: "No resume issues flagged — bullet looks strong.",
  healthcare: "No healthcare issues flagged — writing looks clear.",
  academic: "No academic issues flagged — tone looks formal.",
  business: "No business issues flagged — writing looks professional.",
  default: "No issues flagged for this mode.",
};

const SCAN_MSG: Partial<Record<WritingMode, string>> & { default: string } = {
  general: "Analyzing your writing…",
  email: "Analyzing email professionalism…",
  resume: "Analyzing resume quality…",
  healthcare: "Analyzing clinical writing…",
  academic: "Analyzing academic tone…",
  business: "Analyzing business writing…",
  default: "Analyzing…",
};

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
  onSelect,
  onApply,
  onIgnore,
  onAddToDictionary,
}: Props) {
  const mode = writingMode;
  const [category, setCategory] = useState<SuggestionCategory>("all");

  const filtered = issues.filter(
    (i) => category === "all" || issueCategory(i) === category
  );
  const [explainedId, setExplainedId] = useState<string | null>(null);

  return (
    <section className="issues-panel">
      <div className="issues-panel-head">
        <h3>Suggestions {filtered.length > 0 ? `(${filtered.length})` : ""}</h3>
        {checking && <span className="check-badge">Analyzing…</span>}
      </div>

      <div className="issue-filters">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={category === c.id ? "active" : ""}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && !checking && issues.length === 0 && (
        <EmptyState
          title="No issues"
          message={EMPTY_MSG[mode] ?? EMPTY_MSG.default}
        />
      )}

      {filtered.length === 0 && !checking && issues.length > 0 && (
        <p className="empty muted">No suggestions in this category.</p>
      )}

      {filtered.length === 0 && checking && (
        <p className="empty muted">{SCAN_MSG[mode] ?? SCAN_MSG.default}</p>
      )}

      <ul className={`issues-list ${checking ? "is-checking" : ""}`}>
        {[...filtered]
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
                    Accept
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
                {canAddToDictionary(issue) && (
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
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
