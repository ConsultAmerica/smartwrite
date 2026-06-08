import type { ReactNode } from "react";
import type { AgentResponse } from "../types";
import "./AgentCard.css";

export interface AgentCardProps {
  title: string;
  description: string;
  onRun: () => void;
  loading: boolean;
  result?: AgentResponse | null;
  error?: string | null;
  onApply?: (rewrite: string) => void;
  extraControls?: ReactNode;
}

function formatResult(result: AgentResponse): string {
  const r = result.result;
  if (result.agent === "grader" && r.score != null) {
    const lines = [`Score: ${r.score}/100`];
    if (r.rubric) {
      lines.push(
        ...Object.values(r.rubric).filter(Boolean).map(String)
      );
    }
    if (r.suggestions?.length) {
      lines.push("", "Suggestions:", ...r.suggestions.map((s) => `• ${s}`));
    }
    return lines.join("\n");
  }
  if (r.rewrite) {
    const notes =
      r.explanation?.join(" ") ||
      r.notes?.join(" ") ||
      r.changes?.join(" ") ||
      "";
    return notes ? `${r.rewrite}\n\n— ${notes}` : r.rewrite;
  }
  return JSON.stringify(r, null, 2);
}

export default function AgentCard({
  title,
  description,
  onRun,
  loading,
  result,
  error,
  onApply,
  extraControls,
}: AgentCardProps) {
  const rewrite = result?.result?.rewrite;

  return (
    <article className="agent-card panel-card">
      <div className="agent-card-head">
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        <button type="button" className="btn secondary" onClick={onRun} disabled={loading}>
          {loading ? "Running…" : "Run"}
        </button>
      </div>

      {extraControls}

      {error && <p className="agent-error">{error}</p>}

      {result && (
        <div className="agent-result">
          <span className="agent-result-label">Result</span>
          <pre>{formatResult(result)}</pre>
          {rewrite && onApply && (
            <button type="button" className="btn primary agent-apply" onClick={() => onApply(rewrite)}>
              Apply rewrite
            </button>
          )}
        </div>
      )}
    </article>
  );
}
