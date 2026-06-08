import type { ToneResult } from "../types";
import { scoreLevel, scoreLevelLabel } from "../services/scoring";
import "./ScoreCard.css";

interface Props {
  tone: ToneResult | null;
  checking?: boolean;
}

function ScoreRing({ score }: { score: number }) {
  const level = scoreLevel(score);
  return (
    <div className={`score-ring score-level-${level}`}>
      <span className="score-ring-value">{score}</span>
      <span className="score-ring-label">{scoreLevelLabel(score)}</span>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  const level = scoreLevel(value);
  return (
    <div className="sub-score">
      <span className="sub-score-label">{label}</span>
      <span className={`sub-score-value score-level-${level}`}>{value}%</span>
      <div className="sub-score-bar">
        <span className={`sub-score-fill score-level-${level}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ScoreCard({ tone, checking }: Props) {
  const scores = tone?.writing_scores;

  return (
    <section className="score-card panel-card">
      <div className="score-card-head">
        <h3>Writing Score</h3>
        {checking && <span className="score-badge">Analyzing…</span>}
      </div>
      {!tone ? (
        <p className="score-empty">Check your writing to see scores.</p>
      ) : (
        <>
          <div className="score-card-overview">
            <ScoreRing score={scores?.overall ?? tone.grammar_score} />
            <div className="score-card-meta">
              <p className="score-tone">{tone.tone}</p>
              <p className="score-summary">{checking ? "Analyzing…" : tone.summary}</p>
            </div>
          </div>
          <div className="sub-score-grid">
            <SubScore label="Clarity" value={scores?.clarity ?? tone.clarity_score} />
            <SubScore label="Grammar" value={scores?.grammar ?? tone.grammar_score} />
            <SubScore label="Tone" value={scores?.tone ?? 80} />
            <SubScore label="Readability" value={scores?.readability ?? tone.clarity_score} />
          </div>
        </>
      )}
    </section>
  );
}
