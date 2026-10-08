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
  const enoughContent = hasText && wordCount >= 20;
  const raw = enoughContent ? tone?.writing_scores?.overall ?? tone?.grammar_score ?? null : null;
  const nextScore = raw != null ? clampDisplayScore(raw, issueCount) : null;

  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!hasText || !enoughContent) {
      setDisplayScore(null);
      setUpdating(false);
      return;
    }
    if (checking) {
      setUpdating(true);
      return;
    }
    if (nextScore == null) {
      setUpdating(Boolean(hasText && checking));
      return;
    }
    setUpdating(true);
    const id = window.setTimeout(() => {
      setDisplayScore(nextScore);
      setUpdating(false);
    }, 750);
    return () => window.clearTimeout(id);
  }, [checking, nextScore, hasText, enoughContent]);

  const level = displayScore != null ? scoreLevel(displayScore) : null;
  const showUpdating = enoughContent && (checking || updating);
  const shortDraft = hasText && !enoughContent;

  return (
    <section className={`score-card${compact ? " compact" : ""}`}>
      <div className="score-card-head">
        <h3>Writing score</h3>
        {showUpdating && <span className="score-badge">Updating…</span>}
      </div>
      {displayScore == null ? (
        <div className="score-empty-block">
          <span className="score-number score-number-empty" aria-hidden="true">
            —
          </span>
          <p className="score-empty">
            {!hasText
              ? "Start writing to see your score."
              : shortDraft
                ? "Analyzing as you write…"
                : "Start writing to see your score."}
          </p>
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
