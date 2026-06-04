import type { ToneResult, WritingMode } from "../types";
import ClarityPanel from "./ClarityPanel";
import "./TonePanel.css";

interface Props {
  tone: ToneResult | null;
  refreshing: boolean;
  checking?: boolean;
  writingMode?: WritingMode;
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

const PANEL_TITLE: Record<WritingMode, string> = {
  general: "Writing scores",
  email: "Email scores",
  resume: "Resume scores",
  healthcare: "Healthcare scores",
  academic: "Academic scores",
  business: "Business scores",
};

const SCAN_MSG: Record<WritingMode, string> = {
  general: "Analyzing grammar and clarity…",
  email: "Analyzing email professionalism…",
  resume: "Analyzing resume quality…",
  healthcare: "Analyzing clinical writing…",
  academic: "Analyzing academic formality…",
  business: "Analyzing business writing…",
};

export default function TonePanel({ tone, refreshing, checking, writingMode = "general" }: Props) {
  const isScanning = checking || refreshing;
  const mode = writingMode;

  return (
    <section className={`tone-panel ${refreshing ? "is-refreshing" : ""}`}>
      <div className="tone-panel-head">
        <h3>{PANEL_TITLE[mode]}</h3>
        {isScanning && <span className="refresh-badge">{checking ? "Checking…" : "Updating…"}</span>}
      </div>
      {tone ? (
        <>
          <div className="score-grid">
            {mode === "resume" && (
              <>
                <ScoreCard
                  label="Resume Strength"
                  value={tone.resume_strength_score ?? tone.grammar_score}
                  showBar
                />
                <ScoreCard label="Impact" value={tone.impact_score ?? 50} showBar />
                <ScoreCard label="Clarity" value={tone.clarity_score} showBar />
                <ScoreCard
                  label="Issues"
                  value={isScanning && tone.suggestion_count === 0 ? "…" : String(tone.suggestion_count)}
                />
              </>
            )}
            {mode === "email" && (
              <>
                <ScoreCard
                  label="Professionalism"
                  value={tone.professionalism_score ?? tone.grammar_score}
                  showBar
                />
                <ScoreCard label="Clarity" value={tone.clarity_score} showBar />
                <ScoreCard label="Tone" value={tone.tone} />
                <ScoreCard label="Issues" value={String(tone.suggestion_count)} />
              </>
            )}
            {mode === "healthcare" && (
              <>
                <ScoreCard
                  label="Clinical Clarity"
                  value={tone.clinical_clarity_score ?? tone.clarity_score}
                  showBar
                />
                <ScoreCard
                  label="Professionalism"
                  value={tone.professionalism_score ?? 85}
                  showBar
                />
                <ScoreCard label="Grammar" value={tone.grammar_score} showBar />
                <ScoreCard label="Issues" value={String(tone.suggestion_count)} />
              </>
            )}
            {mode === "general" && (
              <>
                <ScoreCard label="Grammar" value={tone.grammar_score} showBar />
                <ScoreCard label="Clarity" value={tone.clarity_score} showBar />
                <ScoreCard label="Tone" value={tone.tone} />
                <ScoreCard label="Issues" value={String(tone.suggestion_count)} />
              </>
            )}
          </div>
          <p className="tone-summary">{isScanning ? SCAN_MSG[mode] : tone.summary}</p>
          {mode === "general" && (
            <ClarityPanel
              score={tone.clarity_score}
              suggestions={tone.clarity_suggestions ?? []}
            />
          )}
        </>
      ) : (
        <p className="muted">Click Check Grammar to analyze this {mode} text.</p>
      )}
    </section>
  );
}
