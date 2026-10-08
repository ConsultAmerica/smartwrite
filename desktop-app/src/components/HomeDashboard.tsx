import { useMemo } from "react";
import { DOCUMENT_TEMPLATES, templateCategoryLabel } from "../constants/templates";
import type { Document } from "../types";
import {
  documentDisplayTitle,
  documentRowMeta,
  titleCounts as buildTitleCounts,
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
  const recent = documents.slice(0, 8);
  const counts = useMemo(() => buildTitleCounts(documents), [documents]);

  return (
    <div className="home-dashboard">
      <div className="home-dashboard-inner">
        <header className="home-hero">
          <div className="home-hero-copy">
            <p className="home-brand">SmartWrite</p>
            <h1>What are you working on?</h1>
            <p className="home-lead">Pick up where you left off or start something new.</p>
            <button type="button" className="home-cta" onClick={onNew}>
              + New document
            </button>
          </div>
          <div className="home-hero-aside" aria-hidden="true">
            <img src="/images/hero-writing.svg" alt="" width={168} height={100} />
          </div>
        </header>

        <section className="home-section" aria-labelledby="home-recent-heading">
          <div className="home-section-head">
            <h2 id="home-recent-heading">Recent documents</h2>
            {recent.length > 0 && onViewDocuments && (
              <button type="button" className="home-view-all" onClick={onViewDocuments}>
                View all ›
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <p className="home-empty-recent">No documents yet. Create one or open a template below.</p>
          ) : (
            <ul className="home-recent-list">
              {recent.map((doc) => {
                const title = documentDisplayTitle(doc, counts);
                const meta = documentRowMeta(doc);
                return (
                  <li key={`${doc.id}-${doc.local_id ?? ""}`}>
                    <button type="button" onClick={() => onOpenDocument(doc)}>
                      <span className="home-recent-thumb" aria-hidden="true">
                        <img src="/images/doc-thumb.svg" alt="" width={36} height={36} />
                      </span>
                      <span className="home-recent-main">
                        <span className="home-recent-title">{title}</span>
                        <span className="home-recent-meta">{meta.metaLine}</span>
                      </span>
                      <span className="home-recent-words">{meta.words}</span>
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
                View all ›
              </button>
            )}
          </div>
          <ul className="home-template-grid">
            {starters.map((template) => (
              <li key={template.id}>
                <button type="button" onClick={() => onOpenTemplate(template.id)}>
                  <span className="home-template-image" aria-hidden="true">
                    <img src={template.image} alt="" width={160} height={72} />
                  </span>
                  <span className="home-template-copy">
                    <em className="home-template-cat">
                      {templateCategoryLabel(template.id, template.category)}
                    </em>
                    <strong>{template.title}</strong>
                    <span>{template.description}</span>
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
