import type { ClaritySuggestion } from "../types";
import "./ClarityPanel.css";

interface Props {
  score: number;
  suggestions: ClaritySuggestion[];
}

export default function ClarityPanel({ score, suggestions }: Props) {
  if (suggestions.length === 0) {
    if (score >= 95) {
      return (
        <section className="clarity-panel">
          <p className="clarity-ok">Clarity looks good — sentences are a readable length.</p>
        </section>
      );
    }
    return null;
  }

  return (
    <section className="clarity-panel">
      <h3>Clarity · {score}%</h3>
      {suggestions.map((s) => (
        <article key={s.id} className="clarity-card">
          <span className="clarity-tag">{s.title.toUpperCase()}</span>
          <p className="clarity-msg">{s.message}</p>
          <p className="clarity-sentence">"{s.sentence}"</p>
          <div className="clarity-suggest-block">
            <span className="label">Suggestion:</span>
            <p>{s.suggestion}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
