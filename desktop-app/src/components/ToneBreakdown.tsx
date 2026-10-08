import type { ToneMode, ToneResult } from "../types";
import "./ToneBreakdown.css";

interface Props {
  tone: ToneResult | null;
  onAdjustTone?: (mode: ToneMode, label: string) => void;
}

function deriveBars(tone: ToneResult | null) {
  if (!tone) {
    return [
      { label: "Professional", value: 0 },
      { label: "Confident", value: 0 },
      { label: "Friendly", value: 0 },
    ];
  }
  const scores = tone.writing_scores;
  const professional = scores?.professionalism ?? tone.professionalism_score ?? Math.round((tone.grammar_score + (scores?.tone ?? 80)) / 2);
  const confident = Math.min(99, Math.round((scores?.tone ?? 78) * 0.92 + (scores?.clarity ?? tone.clarity_score) * 0.08));
  const friendly = Math.min(99, Math.round(64 + ((scores?.tone ?? 70) - 70) * 0.4));
  return [
    { label: "Professional", value: professional },
    { label: "Confident", value: confident },
    { label: "Friendly", value: Math.max(40, friendly) },
  ];
}

export default function ToneBreakdown({ tone, onAdjustTone }: Props) {
  const bars = deriveBars(tone);
  const dominant = bars.reduce((a, b) => (b.value > a.value ? b : a), bars[0]);
  const hesitant = bars.find((b) => b.label === "Confident")!.value < 75;

  return (
    <section className="tone-breakdown">
      <h4>How you sound</h4>
      {!tone ? (
        <p className="tone-empty">Write a bit more to see tone analysis.</p>
      ) : (
        <>
          <ul className="tone-bars">
            {bars.map((bar) => (
              <li key={bar.label}>
                <div className="tone-bar-head">
                  <span>{bar.label}</span>
                  <span>{bar.value}%</span>
                </div>
                <div className="tone-bar-track">
                  <span style={{ width: `${bar.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="tone-insight">
            Your message sounds {dominant.label.toLowerCase()}
            {hesitant ? " but slightly hesitant." : "."}
          </p>
          {onAdjustTone && (
            <button
              type="button"
              className="tone-cta"
              onClick={() => onAdjustTone("confident", "Make more confident")}
            >
              Make more confident
            </button>
          )}
        </>
      )}
    </section>
  );
}
