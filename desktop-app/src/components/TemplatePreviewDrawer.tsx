import { useRef, useState } from "react";
import {
  AUDIENCE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  FORMALITY_OPTIONS,
  INTENT_OPTIONS,
  TONE_OPTIONS,
  type WritingGoals,
} from "../constants/writingGoals";
import { templateCategoryLabel } from "../constants/templates";
import type { DocumentTemplate } from "../types";
import "./TemplatePreviewDrawer.css";

interface Props {
  template: DocumentTemplate | null;
  goals: WritingGoals | null;
  onClose: () => void;
  onUse: (template: DocumentTemplate) => void;
  onOpenInEditor?: (template: DocumentTemplate) => void;
}

function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export default function TemplatePreviewDrawer({
  template,
  goals,
  onClose,
  onUse,
  onOpenInEditor,
}: Props) {
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  if (!template || !goals) return null;

  const preview = template.content.split("\n").slice(0, 14).join("\n");
  const intentLabel =
    goals.intent === "request"
      ? "Inform / Request"
      : labelFor(INTENT_OPTIONS, goals.intent);

  const useOnce = (fn: (t: DocumentTemplate) => void) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    fn(template);
  };

  return (
    <>
      <button
        type="button"
        className="template-preview-backdrop"
        aria-label="Close template preview"
        onClick={onClose}
      />
      <aside
        className="template-preview-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${template.title} preview`}
      >
        <header className="template-preview-header">
          <div>
            <em className="template-preview-cat">
              {templateCategoryLabel(template.id, template.category)}
            </em>
            <h2>{template.title}</h2>
            <p>{template.description}</p>
          </div>
          <button type="button" className="template-preview-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="template-preview-body">
          <section className="template-preview-section">
            <h3>Preview</h3>
            <pre className="template-preview-text">{preview}</pre>
          </section>

          <section className="template-preview-section">
            <h3>Writing goals</h3>
            <dl className="template-preview-goals">
              <div>
                <dt>Document type</dt>
                <dd>{labelFor(DOCUMENT_TYPE_OPTIONS, goals.documentType)}</dd>
              </div>
              <div>
                <dt>Tone</dt>
                <dd>{labelFor(TONE_OPTIONS, goals.tone)}</dd>
              </div>
              <div>
                <dt>Audience</dt>
                <dd>{labelFor(AUDIENCE_OPTIONS, goals.audience)}</dd>
              </div>
              <div>
                <dt>Formality</dt>
                <dd>{labelFor(FORMALITY_OPTIONS, goals.formality)}</dd>
              </div>
              <div>
                <dt>Intent</dt>
                <dd>{intentLabel}</dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className="template-preview-footer">
          <button
            type="button"
            className="template-preview-use"
            disabled={creating}
            onClick={() => useOnce(onUse)}
          >
            {creating ? "Creating…" : "Use this template"}
          </button>
          {onOpenInEditor && (
            <button
              type="button"
              className="template-preview-secondary"
              disabled={creating}
              onClick={() => useOnce(onOpenInEditor)}
            >
              Open in editor
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}
