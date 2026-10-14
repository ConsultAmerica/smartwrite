import type { GrammarIssue } from "../types";
import { suggestionBucket } from "../services/scoring";
import { nearbyWords } from "../utils/textContext";
import "./SuggestionPopover.css";

interface Props {
  issue: GrammarIssue;
  top: number;
  left: number;
  pinned?: boolean;
  documentText?: string;
  onAccept: (replacement?: string) => void;
  onIgnore: () => void;
  onAskAgent?: () => void;
  onClose: () => void;
  onMouseEnterPopover?: () => void;
  onMouseLeavePopover?: () => void;
}

const BUCKET_LABEL: Record<string, string> = {
  correctness: "Correctness",
  clarity: "Clarity",
  tone: "Tone",
  style: "Style",
};

const BUCKET_TIP: Record<string, string> = {
  correctness: "Fix spelling, grammar, or punctuation.",
  clarity: "Make the sentence easier to follow.",
  tone: "Adjust voice for your audience.",
  style: "Tighten wording and word choice.",
};

function isWhitespaceFocused(issue: GrammarIssue): boolean {
  const problem = issue.problem ?? "";
  const blob = `${issue.message} ${issue.short_message}`;
  if (/extra\s*space|whitespace|double\s*space/i.test(blob)) return true;
  return problem.length > 0 && /^\s+$/.test(problem);
}

export default function SuggestionPopover({
  issue,
  top,
  left,
  pinned = false,
  documentText = "",
  onAccept,
  onIgnore,
  onAskAgent,
  onClose,
  onMouseEnterPopover,
  onMouseLeavePopover,
}: Props) {
  const suggestion = issue.suggestion || issue.replacements[0] || "";
  const alts = (issue.replacements || []).filter((r) => r && r !== suggestion).slice(0, 2);
  const bucket = suggestionBucket(issue);
  const why = issue.why || BUCKET_TIP[bucket] || "Suggested improvement for this phrase.";
  const ws = isWhitespaceFocused(issue);
  const leftCtx = ws ? nearbyWords(documentText, issue.offset, issue.length, "before", 2) : "";
  const rightCtx = ws ? nearbyWords(documentText, issue.offset, issue.length, "after", 2) : "";

  return (
    <div
      className={`suggestion-popover bucket-${bucket}${pinned ? " pinned" : ""}`}
      style={{ top, left }}
      onMouseEnter={onMouseEnterPopover}
      onMouseLeave={onMouseLeavePopover}
      role="dialog"
      aria-label={`${BUCKET_LABEL[bucket] ?? "Suggestion"}: ${issue.short_message || issue.message}`}
    >
      <div className="sp-head">
        <span className="sp-type">{BUCKET_LABEL[bucket] ?? "Suggestion"}</span>
        {pinned && (
          <button type="button" className="sp-close" onClick={onClose} aria-label="Close suggestion">
            ×
          </button>
        )}
      </div>

      <p className="sp-title">{issue.short_message || issue.issue_title || issue.message}</p>

      {(issue.problem || suggestion) && (
        <p className="sp-fix">
          {ws ? (
            <>
              <span className="sp-ws-snippet">
                {leftCtx ? `${leftCtx} ` : ""}
                <mark className="sp-ws-mark bad">{(issue.problem || "  ").replace(/ /g, "·")}</mark>
                {rightCtx ? ` ${rightCtx}` : ""}
              </span>
              <span className="sp-arrow" aria-hidden="true">
                →
              </span>
              <span className="sp-ws-snippet">
                {leftCtx ? `${leftCtx} ` : ""}
                <mark className="sp-ws-mark ok">
                  {suggestion === "" ? "" : (suggestion || " ").replace(/ /g, "·") || "·"}
                </mark>
                {rightCtx ? ` ${rightCtx}` : ""}
              </span>
            </>
          ) : (
            <>
              {issue.problem ? <span className="sp-original">{issue.problem}</span> : null}
              {suggestion ? (
                <>
                  <span className="sp-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="sp-suggestion">{suggestion}</span>
                </>
              ) : null}
            </>
          )}
        </p>
      )}

      <p className="sp-explain">
        <span className="sp-learn">Why</span> {why}
      </p>

      <div className="sp-actions">
        {suggestion && (
          <button type="button" className="sp-fix-btn" onClick={() => onAccept(suggestion)}>
            Fix: {suggestion.length > 28 ? `${suggestion.slice(0, 28)}…` : suggestion}
          </button>
        )}
        <div className="sp-secondary-row">
          <button type="button" className="sp-dismiss" onClick={onIgnore}>
            Dismiss
          </button>
          {onAskAgent && (
            <button type="button" className="sp-ask" onClick={onAskAgent}>
              Ask AI
            </button>
          )}
        </div>
      </div>

      {alts.length > 0 && (
        <div className="sp-alts" role="group" aria-label="Other replacements">
          {alts.map((alt) => (
            <button key={alt} type="button" className="sp-alt" onClick={() => onAccept(alt)}>
              {alt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
