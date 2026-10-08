import { useEffect, useMemo, useState } from "react";
import {
  categorySectionTitle,
  DOCUMENT_TEMPLATES,
  featuredTemplates,
  goalsForTemplate,
  templateCategoryLabel,
  templateMatchesQuery,
} from "../constants/templates";
import type { DocumentTemplate, TemplateCategory } from "../types";
import { trackBetaEvent } from "../services/betaAnalytics";
import TemplatePreviewDrawer from "./TemplatePreviewDrawer";
import "./TemplatesPage.css";

interface Props {
  onOpenTemplate: (templateId: string, options?: { openGoals?: boolean }) => void;
}

type BrowseCategory = "all" | TemplateCategory;

const FILTERS: { id: BrowseCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "academic", label: "Academic" },
  { id: "business", label: "Business" },
  { id: "career", label: "Career" },
];

function TemplateCard({
  template,
  featured = false,
  selected = false,
  onSelect,
}: {
  template: DocumentTemplate;
  featured?: boolean;
  selected?: boolean;
  onSelect: (template: DocumentTemplate) => void;
}) {
  return (
    <button
      type="button"
      className={`templates-card${featured ? " featured" : ""}${selected ? " selected" : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect(template)}
    >
      <span className="templates-card-image" aria-hidden="true">
        <img src={template.image} alt="" width={320} height={140} />
      </span>
      <span className="templates-card-copy">
        <em className="templates-card-cat">{templateCategoryLabel(template.id, template.category)}</em>
        <strong>{template.title}</strong>
        <span className="templates-card-desc">{template.description}</span>
        <span className="templates-card-use">
          Use template
          <span aria-hidden="true"> →</span>
        </span>
      </span>
    </button>
  );
}

export default function TemplatesPage({ onOpenTemplate }: Props) {
  const [category, setCategory] = useState<BrowseCategory>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<DocumentTemplate | null>(null);

  const openPreview = (template: DocumentTemplate) => {
    setPreview(template);
    trackBetaEvent("template_previewed", { templateType: template.id });
  };

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const filtered = useMemo(() => {
    return DOCUMENT_TEMPLATES.filter((template) => {
      if (category !== "all" && template.category !== category) return false;
      return templateMatchesQuery(template, query);
    });
  }, [category, query]);

  const featured = useMemo(() => {
    if (category !== "all" || query.trim()) return [];
    return featuredTemplates().filter((t) => filtered.some((f) => f.id === t.id));
  }, [category, query, filtered]);

  const previewGoals = preview ? goalsForTemplate(preview) : null;
  const sectionTitle =
    category === "all" && !query.trim() ? "All templates" : categorySectionTitle(category);

  return (
    <div className="templates-page">
      <div className="templates-page-inner">
        <header className="templates-page-head">
          <div className="templates-page-head-copy">
            <h1>Templates</h1>
            <p>Start with a structured writing format and customize it as you go.</p>
          </div>
          <input
            className="templates-page-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            aria-label="Search templates"
          />
        </header>

        <div className="templates-page-filters" role="tablist" aria-label="Template categories">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={category === filter.id}
              className={category === filter.id ? "active" : ""}
              onClick={() => setCategory(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="templates-page-empty">
            <strong>No templates found</strong>
            <p>Try another category or search term.</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="templates-page-section" aria-labelledby="templates-featured">
                <div className="templates-page-section-head">
                  <h2 id="templates-featured">Featured</h2>
                </div>
                <ul className="templates-featured-grid">
                  {featured.map((template) => (
                    <li key={template.id}>
                      <TemplateCard
                        template={template}
                        featured
                        selected={preview?.id === template.id}
                        onSelect={openPreview}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="templates-page-section" aria-labelledby="templates-all">
              <div className="templates-page-section-head">
                <h2 id="templates-all">{sectionTitle}</h2>
                <span className="templates-page-count">
                  {filtered.length} template{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="templates-page-grid">
                {filtered.map((template) => (
                  <li key={template.id}>
                    <TemplateCard
                      template={template}
                      selected={preview?.id === template.id}
                      onSelect={openPreview}
                    />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      <TemplatePreviewDrawer
        template={preview}
        goals={previewGoals}
        onClose={() => setPreview(null)}
        onUse={(template) => {
          setPreview(null);
          onOpenTemplate(template.id);
        }}
        onOpenInEditor={(template) => {
          setPreview(null);
          onOpenTemplate(template.id);
        }}
      />
    </div>
  );
}
