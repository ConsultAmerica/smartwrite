import type { ToneResult } from "../types";
import { scoreLevel, scoreLevelLabel } from "../services/scoring";
import "./ScorePanel.css";

interface Props {
  tone: ToneResult | null;
  checking?: boolean;
  refreshing?: boolean;
}

function ScoreRing({ score }: { score: number }) {
  const level = scoreLevel(score);
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div
      className={`score-ring score-level-${level}`}
      style={{ ["--score" as string]: clamped }}
      role="img"
      aria-label={`${score} out of 100, ${scoreLevelLabel(score)}`}
    >
      <span className="score-ring-value">{score}</span>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  const level = scoreLevel(value);
  return (
    <div className="mini-score">
      <div className="mini-score-head">
        <span className="mini-score-label">{label}</span>
        <span className={`mini-score-value score-level-${level}`}>{value}%</span>
      </div>
      <div className="mini-score-bar">
        <span className={`mini-score-fill score-level-${level}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export default function ScorePanel({ tone, checking, refreshing }: Props) {
  const scanning = checking || refreshing;
  const scores = tone?.writing_scores;

  return (
    <section className="score-panel panel-card">
      <div className="score-panel-head">
        <h3>Writing Score</h3>
        {scanning && <span className="score-badge">Analyzing…</span>}
      </div>
      {!tone ? (
        <p className="score-empty">Run Check Grammar to see your writing scores.</p>
      ) : (
        <>
          <div className="score-overview">
            <ScoreRing score={scores?.overall ?? tone.grammar_score} />
            <div className="score-meta">
              <div className="score-meta-top">
                <p className="score-tone">{tone.tone}</p>
                <span className={`score-status score-level-${scoreLevel(scores?.overall ?? tone.grammar_score)}`}>
                  {scoreLevelLabel(scores?.overall ?? tone.grammar_score)}
                </span>
              </div>
              <p className="score-summary">{scanning ? "Analyzing your writing…" : tone.summary}</p>
              <p className="score-issues">{tone.suggestion_count} suggestion{tone.suggestion_count === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="mini-score-grid">
            <MiniScore label="Grammar" value={scores?.grammar ?? tone.grammar_score} />
            <MiniScore label="Clarity" value={scores?.clarity ?? tone.clarity_score} />
            <MiniScore label="Tone" value={scores?.tone ?? 80} />
            <MiniScore label="Readability" value={scores?.readability ?? tone.clarity_score} />
            <MiniScore label="Professionalism" value={scores?.professionalism ?? tone.professionalism_score ?? tone.grammar_score} />
          </div>
        </>
      )}
    </section>
  );
}
