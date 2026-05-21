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

const GENERAL_ACTIONS: { mode: ToneMode; label: string }[] = [
  { mode: "grammar", label: "Fix grammar" },
  { mode: "clarity", label: "Clarity" },
  { mode: "professional", label: "Tone" },
  { mode: "shorter", label: "Shorter" },
  { mode: "formal", label: "More professional" },
];

const EMAIL_ACTIONS = [
  { action: "polite", label: "Polite email" },
  { action: "short", label: "Short email" },
  { action: "professional", label: "Professional email" },
  { action: "followup", label: "Follow-up email" },
  { action: "apology", label: "Apology email" },
];

const RESUME_ACTIONS = [
  { action: "bullet", label: "Improve bullet" },
  { action: "action_verbs", label: "Add action verbs" },
  { action: "measurable", label: "Add measurable impact" },
  { action: "ats", label: "ATS keywords" },
  { action: "stronger", label: "Make stronger" },
];

const HEALTHCARE_ACTIONS = [
  { action: "clinical_tone", label: "Clinical tone" },
  { action: "patient_friendly", label: "Care-team clarity" },
  { action: "concise", label: "More concise" },
  { action: "compliance", label: "Compliance polish" },
  { action: "care_plan", label: "Care plan note" },
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
    <section className="rewrite-panel">
      <h3>AI actions — {writingMode}</h3>
      {!documentHasText && (
        <p className="hint">Add text in the editor, or use Load sample above.</p>
      )}
      {documentHasText && !hasSelection && (
        <p className="hint">Actions apply to the full document. Select text to limit scope.</p>
      )}
      {hasSelection && (
        <p className="hint selection-hint">Selection only ({selectedText.trim().length} chars)</p>
      )}

      {writingMode === "general" && (
        <div className="action-group">
          <span className="group-label">General mode</span>
          <div className="action-btns">
            {GENERAL_ACTIONS.map((a) => (
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
      )}

      {writingMode === "email" && (
        <div className="action-group">
          <span className="group-label">Email mode</span>
          <div className="action-btns">
            {EMAIL_ACTIONS.map((a) => (
              <button
                key={a.action}
                type="button"
                className="action-btn"
                disabled={!canRunAction}
                onClick={() => onEmailAction(a.action, a.label)}
              >
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
              <button
                key={a.action}
                type="button"
                className="action-btn"
                disabled={!canRunAction}
                onClick={() => onResumeAction(a.action, a.label)}
              >
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
              <button
                key={a.action}
                type="button"
                className="action-btn"
                disabled={!canRunAction}
                onClick={() => onHealthcareAction(a.action, a.label)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
