import { useMemo } from "react";
import { DOCUMENT_TEMPLATES, templateCategoryLabel } from "../constants/templates";
import type { Document } from "../types";
import {
  documentDisplayTitle,
  documentRowMeta,
  titleCounts as buildTitleCounts,
  userFacingDocuments,
} from "../utils/documentList";
import "./HomeDashboard.css";

interface Props {
  documents: Document[];
  onNew: () => void;
  onOpenDocument: (doc: Document) => void;
  onOpenTemplate: (templateId: string) => void;
  onViewDocuments?: () => void;
  onViewTemplates?: () => void;
}

const STARTER_IDS = [
  "professional-email",
  "resume-summary",
  "academic-paragraph",
  "business-proposal",
] as const;

const QUICK_STARTS = [
  {
    id: "professional-email",
    label: "Email",
    hint: "Clear & polished",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2.2.7 5.3 3.7c.3.2.7.2 1 0l5.3-3.7H6.2Zm11.6 1.9-4.8 3.3c-.8.55-1.9.55-2.7 0L5.5 9.1v8.4c0 .55.45 1 1 1h11c.55 0 1-.45 1-1V9.1Z"
        />
      </svg>
    ),
  },
  {
    id: "resume-summary",
    label: "Resume",
    hint: "Career-ready",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 3.75A1.75 1.75 0 0 0 5.25 5.5v13c0 .97.78 1.75 1.75 1.75h10A1.75 1.75 0 0 0 18.75 18.5v-13A1.75 1.75 0 0 0 17 3.75H7ZM8.5 8h7a.75.75 0 0 1 0 1.5h-7A.75.75 0 0 1 8.5 8Zm0 3.5h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1 0-1.5Zm0 3.5h4.5a.75.75 0 0 1 0 1.5H8.5a.75.75 0 0 1 0-1.5Z"
        />
      </svg>
    ),
  },
  {
    id: "academic-paragraph",
    label: "Academic",
    hint: "Formal & structured",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3.25 2.75 8.1a.75.75 0 0 0 0 1.3L6 11.15v4.6c0 .9.5 1.72 1.3 2.14L12 20.5l4.7-2.61A2.45 2.45 0 0 0 18 15.75v-4.6l1.75-.95V14a.75.75 0 0 0 1.5 0V9.4a.75.75 0 0 0-.38-.65L12 3.25Zm0 2.1 7.1 3.85L12 13.05 4.9 9.2 12 5.35Zm4.5 7.35v3.05c0 .3-.17.58-.43.72L12 18.75l-4.07-2.28a.83.83 0 0 1-.43-.72v-3.05L12 14.7l4.5-2Z"
        />
      </svg>
    ),
  },
  {
    id: "business-proposal",
    label: "Business",
    hint: "Client-facing",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9 3.75A1.75 1.75 0 0 0 7.25 5.5V7H5.5A1.75 1.75 0 0 0 3.75 8.75v9.5c0 .97.78 1.75 1.75 1.75h13a1.75 1.75 0 0 0 1.75-1.75v-9.5A1.75 1.75 0 0 0 18.5 7H16.75V5.5A1.75 1.75 0 0 0 15 3.75H9Zm6.25 3.25H8.75V5.5c0-.14.11-.25.25-.25h6c.14 0 .25.11.25.25v1.5ZM5.5 8.5h13c.14 0 .25.11.25.25v1.5H5.25v-1.5c0-.14.11-.25.25-.25Z"
        />
      </svg>
    ),
  },
] as const;

export default function HomeDashboard({
  documents,
  onNew,
  onOpenDocument,
  onOpenTemplate,
  onViewDocuments,
  onViewTemplates,
}: Props) {
  const starters = STARTER_IDS.flatMap((id) => {
    const template = DOCUMENT_TEMPLATES.find((t) => t.id === id);
    return template ? [template] : [];
  });
  const facing = useMemo(() => userFacingDocuments(documents), [documents]);
  const recent = facing.slice(0, 5);
  const counts = useMemo(() => buildTitleCounts(facing), [facing]);

  return (
    <div className="home-dashboard">
      <div className="home-dashboard-inner">
        <header className="home-hero">
          <div className="home-hero-stage" aria-hidden="true">
            <div className="home-hero-wash" />
            <div className="home-hero-preview">
              <div className="hero-stack">
                <div className="hero-doc hero-doc-back" />
                <div className="hero-doc hero-doc-front">
                  <div className="hero-doc-top">
                    <span className="hero-doc-title">Project update</span>
                    <span className="hero-doc-saved">Saved</span>
                  </div>
                  <p className="hero-doc-line">
                    The team{" "}
                    <span className="hero-mark grammar">recieved</span> feedback
                    early and adjusted the plan.
                  </p>
                  <p className="hero-doc-line">
                    Next week we will{" "}
                    <span className="hero-mark clarity">make sure to go ahead and finalize</span>{" "}
                    the timeline.
                  </p>
                  <p className="hero-doc-line muted">
                    Stakeholders stay aligned without long meetings.
                  </p>
                </div>
              </div>

              <div className="hero-popover">
                <span className="hero-popover-type">Clarity</span>
                <strong>Make this more concise</strong>
                <span className="hero-popover-fix">
                  <s>make sure to go ahead and finalize</s>
                  <em>finalize</em>
                </span>
                <span className="hero-popover-btn">Accept</span>
              </div>

              <div className="hero-score">
                <span>Score</span>
                <strong>92</strong>
              </div>

              <div className="hero-chip">Rewrite</div>
            </div>
          </div>
          <div className="home-hero-copy">
            <p className="home-eyebrow">Workspace</p>
            <h1>Write with clarity and confidence.</h1>
            <p className="home-lead">
              Start a document, continue recent work, or open a polished template.
            </p>
            <div className="home-cta-row">
              <button type="button" className="home-cta interactive-press" onClick={onNew}>
                New document
              </button>
              {onViewTemplates && (
                <button
                  type="button"
                  className="home-cta-secondary interactive-press"
                  onClick={onViewTemplates}
                >
                  Browse templates
                </button>
              )}
            </div>
          </div>
        </header>

        <section className="home-section home-section-quick" aria-label="Quick start">
          <div className="home-quickstarts stagger-in" role="group">
            {QUICK_STARTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="home-quickstart interactive-press"
                onClick={() => onOpenTemplate(item.id)}
              >
                <span className="home-quickstart-icon">{item.icon}</span>
                <span className="home-quickstart-text">
                  <span className="home-quickstart-label">{item.label}</span>
                  <span className="home-quickstart-hint">{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-section" aria-labelledby="home-recent-heading">
          <div className="home-section-head">
            <h2 id="home-recent-heading">Recent documents</h2>
            {recent.length > 0 && onViewDocuments && (
              <button type="button" className="home-view-all" onClick={onViewDocuments}>
                View all <span aria-hidden="true">›</span>
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="home-empty-recent">
              <div className="home-empty-copy">
                <strong>Your workspace is ready</strong>
                <p>Create a blank document or jump into a template to get moving.</p>
              </div>
              <div className="home-empty-actions">
                <button type="button" className="home-empty-primary interactive-press" onClick={onNew}>
                  Start blank
                </button>
                {onViewTemplates && (
                  <button
                    type="button"
                    className="home-empty-secondary interactive-press"
                    onClick={onViewTemplates}
                  >
                    Choose template
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ul className="home-recent-list stagger-in">
              {recent.map((doc) => {
                const title = documentDisplayTitle(doc, counts);
                const meta = documentRowMeta(doc);
                return (
                  <li key={`${doc.id}-${doc.local_id ?? ""}`}>
                    <button
                      type="button"
                      className="home-recent-row"
                      onClick={() => onOpenDocument(doc)}
                    >
                      <span className="home-recent-thumb" aria-hidden="true">
                        <img src="/images/doc-thumb.svg" alt="" width={36} height={36} />
                      </span>
                      <span className="home-recent-main">
                        <span className="home-recent-title">{title}</span>
                        <span className="home-recent-meta">{meta.edited}</span>
                      </span>
                      <span className="home-recent-words">{meta.words}</span>
                      <span className="home-recent-actions" aria-hidden="true">
                        <span className="home-recent-more">⋯</span>
                        <span className="home-recent-go">→</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="home-section home-section-templates" aria-labelledby="home-templates-heading">
          <div className="home-section-head">
            <h2 id="home-templates-heading">Templates</h2>
            {onViewTemplates && (
              <button type="button" className="home-view-all" onClick={onViewTemplates}>
                View all <span aria-hidden="true">›</span>
              </button>
            )}
          </div>
          <ul className="home-template-grid stagger-in">
            {starters.map((template) => (
              <li key={template.id}>
                <button type="button" className="home-template-card" onClick={() => onOpenTemplate(template.id)}>
                  <span className="home-template-image" aria-hidden="true">
                    <img src={template.image} alt="" width={160} height={72} />
                    <span className="home-template-overlay">Open</span>
                  </span>
                  <span className="home-template-copy">
                    <em className="home-template-cat">
                      {templateCategoryLabel(template.id, template.category)}
                    </em>
                    <strong>{template.title}</strong>
                    <span>{template.description}</span>
                    <span className="home-template-use">
                      Use template <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
