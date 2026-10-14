import { useEffect, useState } from "react";
import type { ToneResult } from "../types";
import { clampDisplayScore, scoreLevel } from "../services/scoring";
import "./ScoreCard.css";

interface Props {
  tone: ToneResult | null;
  checking?: boolean;
  compact?: boolean;
  issueCount?: number;
  /** When false (blank document), never invent a resting score. */
  hasText?: boolean;
  wordCount?: number;
}

export default function ScoreCard({
  tone,
  checking,
  compact = true,
  issueCount = 0,
  hasText = false,
  wordCount = 0,
}: Props) {
  const shortDraft = hasText && wordCount > 0 && wordCount < 12;
  const raw = hasText ? tone?.writing_scores?.overall ?? tone?.grammar_score ?? null : null;
  const nextScore = raw != null ? clampDisplayScore(raw, issueCount) : null;

  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!hasText) {
      setDisplayScore(null);
      setUpdating(false);
      return;
    }
    if (checking) {
      setUpdating(true);
      return;
    }
    if (nextScore == null) {
      // Waiting for first analysis, or analysis failed — never stick on Analyzing forever
      setUpdating(false);
      return;
    }
    setUpdating(true);
    const id = window.setTimeout(() => {
      setDisplayScore(nextScore);
      setUpdating(false);
    }, 400);
    return () => window.clearTimeout(id);
  }, [checking, nextScore, hasText]);

  const level = displayScore != null ? scoreLevel(displayScore) : null;
  const analyzing = hasText && Boolean(checking || updating);
  const emptyMessage = !hasText
    ? "Start writing to see your score."
    : shortDraft || checking
      ? "Analyzing as you write…"
      : "Score will update after analysis.";

  return (
    <section className={`score-card${compact ? " compact" : ""}`}>
      <div className="score-card-head">
        <h3>Writing score</h3>
        {analyzing && displayScore == null && (
          <span className="score-badge" role="status" aria-live="polite">
            Analyzing…
          </span>
        )}
        {analyzing && displayScore != null && (
          <span className="score-badge" role="status" aria-live="polite">
            Updating…
          </span>
        )}
      </div>
      {displayScore == null ? (
        <div className="score-empty-block">
          <span className="score-number score-number-empty" aria-hidden="true">
            —
          </span>
          <p className="score-empty">{emptyMessage}</p>
        </div>
      ) : (
        <div className="score-hero">
          <div className={`score-hero-value score-level-${level}`}>
            <span className="score-number">{displayScore}</span>
            <span className="score-denom">/ 100</span>
          </div>
          {tone?.summary && !compact && (
            <p className="score-summary">{tone.summary}</p>
          )}
        </div>
      )}
    </section>
  );
}
