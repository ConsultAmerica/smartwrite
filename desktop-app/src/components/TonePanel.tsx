import type { ToneResult } from "../types";
import ClarityPanel from "./ClarityPanel";
import "./TonePanel.css";

interface Props {
  tone: ToneResult | null;
  refreshing: boolean;
}

function ScoreCard({
  label,
  value,
  showBar,
}: {
  label: string;
  value: string | number;
  showBar?: boolean;
}) {
  const num = typeof value === "number" ? value : null;
  return (
    <div className="score-card">
      <span className="score-label">{label}</span>
      <span className="score-value">{typeof value === "number" ? `${value}%` : value}</span>
      {showBar && num !== null && (
        <div className="score-bar" aria-hidden="true">
          <span className="score-fill" style={{ width: `${num}%` }} />
        </div>
      )}
    </div>
  );
}

export default function TonePanel({ tone, refreshing }: Props) {
  return (
    <section className={`tone-panel ${refreshing ? "is-refreshing" : ""}`}>
      <div className="tone-panel-head">
        <h3>Writing scores</h3>
        {refreshing && <span className="refresh-badge">Updating…</span>}
      </div>
      {tone ? (
        <>
          <div className="score-grid">
            <ScoreCard label="Tone" value={tone.tone} />
            <ScoreCard label="Clarity" value={tone.clarity_score} showBar />
            <ScoreCard label="Grammar" value={tone.grammar_score} showBar />
            <ScoreCard
              label="Issues"
              value={
                tone.suggestion_count === 0
                  ? "0"
                  : String(tone.suggestion_count)
              }
            />
          </div>
          <p className="tone-summary">{tone.summary}</p>
          <ClarityPanel
            score={tone.clarity_score}
            suggestions={tone.clarity_suggestions ?? []}
          />
        </>
      ) : (
        <p className="muted">Click Check Grammar to analyze your text.</p>
      )}
    </section>
  );
}
