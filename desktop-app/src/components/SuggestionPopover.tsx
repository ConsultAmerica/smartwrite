import type { GrammarIssue } from "../types";
import { suggestionBucket } from "../services/scoring";
import "./SuggestionPopover.css";

interface Props {
  issue: GrammarIssue;
  top: number;
  left: number;
  onAccept: () => void;
  onIgnore: () => void;
  onAskAgent?: () => void;
  onClose: () => void;
}

const BUCKET_LABEL: Record<string, string> = {
  correctness: "Correctness",
  clarity: "Clarity",
  tone: "Tone",
  style: "Style",
};

export default function SuggestionPopover({
  issue,
  top,
  left,
  onAccept,
  onIgnore,
  onAskAgent,
  onClose,
}: Props) {
  const suggestion = issue.suggestion || issue.replacements[0] || "";
  const bucket = suggestionBucket(issue);

  return (
    <div
      className={`suggestion-popover bucket-${bucket}`}
      style={{ top, left }}
      onMouseLeave={onClose}
      role="dialog"
      aria-label="Suggestion"
    >
      <span className="sp-type">{BUCKET_LABEL[bucket] ?? "Suggestion"}</span>
      <p className="sp-title">{issue.short_message || issue.issue_title || issue.message}</p>
      <p className="sp-fix">
        <span className="sp-original">“{issue.problem || "…"}”</span>
        {suggestion && (
          <>
            <span className="sp-arrow">→</span>
            <span className="sp-suggestion">“{suggestion}”</span>
          </>
        )}
      </p>
      {issue.why && <p className="sp-explain">{issue.why}</p>}
      <div className="sp-actions">
        {suggestion && (
          <button type="button" className="btn primary sp-btn" onClick={onAccept}>
            Accept
          </button>
        )}
        <button type="button" className="btn secondary sp-btn" onClick={onIgnore}>
          Dismiss
        </button>
        {onAskAgent && (
          <button type="button" className="btn ghost sp-btn" onClick={onAskAgent}>
            Ask AI
          </button>
        )}
      </div>
    </div>
  );
}
