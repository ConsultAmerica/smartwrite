import type { GrammarIssue } from "../types";
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

  return (
    <div
      className="suggestion-popover"
      style={{ top, left }}
      onMouseLeave={onClose}
      role="dialog"
      aria-label="Suggestion"
    >
      <span className="sp-type">{issue.issue_title || issue.category || "Suggestion"}</span>
      <p className="sp-fix">
        <span className="sp-original">{issue.problem || "…"}</span>
        {suggestion && (
          <>
            <span className="sp-arrow"> → </span>
            <span className="sp-suggestion">{suggestion}</span>
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
          Ignore
        </button>
        {onAskAgent && (
          <button type="button" className="btn ghost sp-btn" onClick={onAskAgent}>
            Ask Agent
          </button>
        )}
      </div>
    </div>
  );
}
