import type { ToneMode, WritingMode } from "../types";
import "./RewritePanel.css";

interface Props {
  writingMode: WritingMode;
  selectedText: string;
  documentHasText: boolean;
  loading: boolean;
  onRewrite: (mode: ToneMode, label: string) => void;
  onEmailAction: (action: string, label: string) => void;
  onResumeAction: (action: string, label: string) => void;
  onHealthcareAction: (action: string, label: string) => void;
}

const QUICK_REWRITES: { mode: ToneMode; label: string }[] = [
  { mode: "professional", label: "Professional" },
  { mode: "shorter", label: "Shorter" },
  { mode: "clearer", label: "Clearer" },
  { mode: "confident", label: "Confident" },
  { mode: "friendly", label: "Friendly" },
  { mode: "formal", label: "Formal" },
  { mode: "clarity", label: "Simplify" },
  { mode: "grammar", label: "Sentence flow" },
];

const EMAIL_ACTIONS = [
  { action: "polite", label: "Polite email" },
  { action: "short", label: "Short email" },
  { action: "professional", label: "Professional email" },
  { action: "followup", label: "Follow-up" },
  { action: "apology", label: "Apology" },
];

const RESUME_ACTIONS = [
  { action: "bullet", label: "Improve bullet" },
  { action: "action_verbs", label: "Action verbs" },
  { action: "measurable", label: "Add metrics" },
  { action: "ats", label: "ATS keywords" },
  { action: "stronger", label: "Make stronger" },
];

const HEALTHCARE_ACTIONS = [
  { action: "clinical_tone", label: "Clinical tone" },
  { action: "patient_friendly", label: "Care-team clarity" },
  { action: "concise", label: "More concise" },
  { action: "compliance", label: "Compliance polish" },
];

export default function RewritePanel({
  writingMode,
  selectedText,
  documentHasText,
  loading,
  onRewrite,
  onEmailAction,
  onResumeAction,
  onHealthcareAction,
}: Props) {
  const hasSelection = selectedText.trim().length > 0;
  const canRunAction = documentHasText && !loading;

  return (
    <section className="rewrite-panel panel-card">
      <h3>Rewrite tools</h3>
      {!documentHasText && (
        <p className="hint">Start writing or load a template to use rewrite tools.</p>
      )}
      {hasSelection && (
        <p className="hint selection-hint">Selection only ({selectedText.trim().length} chars)</p>
      )}

      <div className="action-group">
        <span className="group-label">Quick rewrite</span>
        <div className="action-btns">
          {QUICK_REWRITES.map((a) => (
            <button
              key={a.label}
              type="button"
              className="action-btn"
              disabled={!canRunAction}
              onClick={() => onRewrite(a.mode, a.label)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {writingMode === "email" && (
        <div className="action-group">
          <span className="group-label">Email mode</span>
          <div className="action-btns">
            {EMAIL_ACTIONS.map((a) => (
              <button key={a.action} type="button" className="action-btn" disabled={!canRunAction} onClick={() => onEmailAction(a.action, a.label)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {writingMode === "resume" && (
        <div className="action-group">
          <span className="group-label">Resume mode</span>
          <div className="action-btns">
            {RESUME_ACTIONS.map((a) => (
              <button key={a.action} type="button" className="action-btn" disabled={!canRunAction} onClick={() => onResumeAction(a.action, a.label)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {writingMode === "healthcare" && (
        <div className="action-group">
          <span className="group-label">Healthcare mode</span>
          <div className="action-btns">
            {HEALTHCARE_ACTIONS.map((a) => (
              <button key={a.action} type="button" className="action-btn" disabled={!canRunAction} onClick={() => onHealthcareAction(a.action, a.label)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(writingMode === "academic" || writingMode === "business" || writingMode === "general") && (
        <div className="action-group">
          <span className="group-label">{writingMode} tips</span>
          <p className="hint">Use Quick rewrite above, then review in Before & After.</p>
        </div>
      )}
    </section>
  );
}
