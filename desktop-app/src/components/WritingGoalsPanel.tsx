import {
  AUDIENCE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  FORMALITY_OPTIONS,
  INTENT_OPTIONS,
  PRESET_GOALS,
  QUICK_PRESETS,
  TONE_OPTIONS,
  type WritingGoals,
  goalsToWritingMode,
} from "../constants/writingGoals";
import type { WritingMode } from "../types";
import "./WritingGoalsPanel.css";

interface Props {
  open: boolean;
  goals: WritingGoals;
  writingMode: WritingMode;
  onChange: (goals: WritingGoals, mode: WritingMode) => void;
  onClose: () => void;
}

export default function WritingGoalsPanel({
  open,
  goals,
  writingMode,
  onChange,
  onClose,
}: Props) {
  if (!open) return null;

  const patch = (partial: Partial<WritingGoals>) => {
    const next = { ...goals, ...partial };
    onChange(next, goalsToWritingMode(next));
  };

  const applyPreset = (mode: WritingMode) => {
    onChange(PRESET_GOALS[mode], mode);
  };

  return (
    <>
      <button type="button" className="goals-backdrop" aria-label="Close writing goals" onClick={onClose} />
      <div className="writing-goals-panel" role="dialog" aria-label="Writing goals">
        <header className="goals-header">
          <div>
            <h3>Writing Goals</h3>
            <p>SmartWrite adjusts feedback to match these goals.</p>
          </div>
          <button type="button" className="goals-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <label className="goals-field">
          <span>Audience</span>
          <select
            value={goals.audience}
            onChange={(e) => patch({ audience: e.target.value as WritingGoals["audience"] })}
          >
            {AUDIENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="goals-field">
          <span>Document type</span>
          <select
            value={goals.documentType}
            onChange={(e) => patch({ documentType: e.target.value as WritingGoals["documentType"] })}
          >
            {DOCUMENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="goals-field">
          <span>Tone</span>
          <select
            value={goals.tone}
            onChange={(e) => patch({ tone: e.target.value as WritingGoals["tone"] })}
          >
            {TONE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="goals-field">
          <span>Formality</span>
          <select
            value={goals.formality}
            onChange={(e) => patch({ formality: e.target.value as WritingGoals["formality"] })}
          >
            {FORMALITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <div className="goals-field">
          <span>Intent</span>
          <div className="goals-intent-chips" role="group" aria-label="Intent">
            {INTENT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={goals.intent === o.value ? "active" : ""}
                onClick={() => patch({ intent: o.value })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="goals-presets">
          <span className="goals-presets-label">Quick presets</span>
          <div className="goals-preset-row">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.mode}
                type="button"
                className={writingMode === p.mode ? "active" : ""}
                onClick={() => applyPreset(p.mode)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
