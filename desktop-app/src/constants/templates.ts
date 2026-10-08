import type { DocumentTemplate, TemplateCategory, WritingMode } from "../types";
import type { WritingGoals } from "./writingGoals";
import { PRESET_GOALS } from "./writingGoals";

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "professional-email",
    title: "Professional Email",
    description: "Clear, polished email for any professional situation.",
    mode: "email",
    category: "email",
    image: "/images/template-email.svg",
    featured: true,
    previewLabel: "Email draft",

    content:
      "To: Sarah Mitchell\nSubject: Project follow-up\n\nHi Sarah,\n\nThank you for taking the time to review the proposal last week. I wanted to follow up on next steps and confirm whether Friday still works for a brief sync.\n\nPlease let me know what works best for you.\n\nBest regards,",
  },
  {
    id: "follow-up-email",
    title: "Follow-up Email",
    description: "A concise nudge after a meeting or unanswered message.",
    mode: "email",
    category: "email",
    image: "/images/template-followup.svg",
    previewLabel: "Follow-up email",
    content:
      "To: Alex Chen\nSubject: Following up on our conversation\n\nHi Alex,\n\nI hope you are doing well. I am following up on our discussion from last Thursday regarding the timeline.\n\nIf it would help, I can send a short summary of open items and proposed dates.\n\nThank you,\n",
  },
  {
    id: "thank-you-email",
    title: "Thank-you Email",
    description: "Warm, professional appreciation after a meeting or interview.",
    mode: "email",
    category: "email",
    image: "/images/template-thanks.svg",
    previewLabel: "Thank-you note",
    content:
      "To: Jordan Lee\nSubject: Thank you\n\nDear Jordan,\n\nThank you for speaking with me today. I appreciated learning more about the role and the team’s priorities.\n\nI am excited about the opportunity to contribute and would welcome any next steps.\n\nSincerely,",
  },
  {
    id: "meeting-request",
    title: "Meeting Request",
    description: "Request time clearly with purpose and suggested slots.",
    mode: "email",
    category: "email",
    image: "/images/template-meeting.svg",
    previewLabel: "Meeting request",
    content:
      "To: Priya Shah\nSubject: Meeting request — Q2 planning\n\nHi Priya,\n\nCould we schedule 30 minutes next week to align on Q2 priorities?\n\nI am available Tuesday 10–12 or Thursday afternoon. Happy to adjust if another time works better.\n\nThank you,",
  },
  {
    id: "customer-response",
    title: "Customer Response",
    description: "Empathetic, clear replies for support and account questions.",
    mode: "email",
    category: "email",
    image: "/images/template-support.svg",
    previewLabel: "Support reply",
    content:
      "To: customer@example.com\nSubject: Re: Account access\n\nThank you for reaching out. I understand how frustrating this issue must be.\n\nI have reviewed your account and applied a fix. Please refresh the page and try again. If anything else comes up, reply to this message and I will help right away.\n\nBest regards,",
  },
  {
    id: "academic-paragraph",
    title: "Academic Paragraph",
    description: "Formal academic writing with clear structure and tone.",
    mode: "academic",
    category: "academic",
    image: "/images/template-academic.svg",
    previewLabel: "Academic excerpt",
    content:
      "This study examines the relationship between digital literacy and academic performance among undergraduate students. The findings suggest that structured training programs significantly improve research skills and written communication outcomes. These results align with prior work emphasizing guided practice over ad hoc technology use (Chen & Morales, 2022).",
  },
  {
    id: "college-essay",
    title: "College Essay",
    description: "Opening structure for a personal academic essay.",
    mode: "academic",
    category: "academic",
    image: "/images/template-essay.svg",
    previewLabel: "Essay opening",
    content:
      "The first time I revised a piece of writing until it felt honest, I learned that clarity is a form of respect for the reader. That habit has shaped how I approach research, collaboration, and every argument I make on the page.\n\nIn the sections that follow, I describe a challenge that tested this belief and the choices that followed.",
  },
  {
    id: "research-summary",
    title: "Research Summary",
    description: "Condense findings into a readable research brief.",
    mode: "academic",
    category: "academic",
    image: "/images/template-research.svg",
    previewLabel: "Research brief",
    content:
      "Summary\nThis brief synthesizes recent findings on remote collaboration effectiveness across mid-size product teams.\n\nKey findings\nTeams with weekly written status updates reported fewer missed dependencies. Asynchronous review cycles reduced meeting time without lowering decision quality.\n\nImplications\nOrganizations may benefit from lightweight documentation norms before investing in additional tooling.",
  },
  {
    id: "business-proposal",
    title: "Business Proposal",
    description: "Client-facing proposal introduction with clear next steps.",
    mode: "business",
    category: "business",
    image: "/images/template-business.svg",
    featured: true,
    previewLabel: "Proposal intro",
    content:
      "Proposal: Operational Efficiency Pilot\n\nOur team proposes a phased implementation plan designed to reduce operational costs while improving service quality. Phase one focuses on process automation; phase two expands analytics and reporting for leadership.\n\nWe recommend a six-week pilot with clear success metrics and a mid-point review.",
  },
  {
    id: "executive-summary",
    title: "Executive Summary",
    description: "A short briefing for leadership with outcomes and asks.",
    mode: "business",
    category: "business",
    image: "/images/template-executive.svg",
    previewLabel: "Executive brief",
    content:
      "Executive summary\n\nSituation\nCustomer onboarding currently takes an average of 12 days.\n\nRecommendation\nLaunch a guided checklist and automated reminders to reduce cycle time by 30%.\n\nAsk\nApprove a cross-functional pilot for one region over the next quarter.",
  },
  {
    id: "project-update",
    title: "Project Update",
    description: "Status note covering progress, risks, and next actions.",
    mode: "business",
    category: "business",
    image: "/images/template-status.svg",
    previewLabel: "Status update",
    content:
      "Project update — Week of March 10\n\nProgress\n- Completed API contract review\n- Shipped onboarding empty states\n\nRisks\n- Design review for settings is blocked on copy finalization\n\nNext week\n- Finalize settings copy\n- Begin accessibility pass on forms",
  },
  {
    id: "resume-summary",
    title: "Resume Summary",
    description: "A compelling professional summary for the top of a resume.",
    mode: "resume",
    category: "career",
    image: "/images/template-resume.svg",
    featured: true,
    previewLabel: "Resume summary",
    content:
      "Alex Rivera\nProduct Engineer  |  React · TypeScript · Systems Design\n\nProfessional summary\nResults-driven software engineer with 5+ years shipping user-facing products end to end. Strong in React, TypeScript, and API design. Known for improving activation metrics and reducing support load through clear UX and reliable delivery.\n\nSelected impact\n• Redesigned onboarding flows that improved activation by 18%\n• Built a shared component library adopted across 4 product teams\n• Partnered with design and support to cut related tickets by 22%\n\nCore skills\nReact, TypeScript, Node.js, accessibility, design systems, cross-functional leadership",
  },
  {
    id: "cover-letter",
    title: "Cover Letter",
    description: "Letter format with greeting, body, and closing.",
    mode: "resume",
    category: "career",
    image: "/images/template-cover.svg",
    previewLabel: "Cover letter",
    content:
      "Dear Hiring Manager,\n\nI am writing to apply for the Product Designer role. Over the past four years I have led end-to-end design for B2B workflows, partnering closely with engineering and research.\n\nI would welcome the chance to discuss how my experience can support your team’s goals.\n\nSincerely,\nAlex Rivera",
  },
  {
    id: "linkedin-summary",
    title: "LinkedIn Summary",
    description: "A crisp About section for a professional profile.",
    mode: "business",
    category: "career",
    image: "/images/template-linkedin.svg",
    previewLabel: "Profile about",
    content:
      "I help teams ship reliable software products. I specialize in frontend architecture, clear documentation, and mentoring junior developers.\n\nOpen to connecting about product engineering and developer experience.",
  },
];

/** Per-template writing goals when they differ from mode presets. */
const TEMPLATE_GOAL_OVERRIDES: Partial<Record<string, Partial<WritingGoals>>> = {
  "professional-email": { tone: "professional", formality: "formal", intent: "request" },
  "follow-up-email": { tone: "professional", formality: "neutral", intent: "request" },
  "thank-you-email": { tone: "friendly", formality: "formal", intent: "inform" },
  "meeting-request": { tone: "professional", formality: "formal", intent: "request" },
  "customer-response": { tone: "friendly", formality: "neutral", intent: "inform" },
  "academic-paragraph": { tone: "formal", formality: "formal", intent: "explain" },
  "college-essay": { tone: "formal", formality: "formal", intent: "persuade" },
  "research-summary": { tone: "formal", formality: "formal", intent: "inform" },
  "business-proposal": { tone: "professional", formality: "formal", intent: "persuade" },
  "executive-summary": { tone: "professional", formality: "formal", intent: "persuade" },
  "project-update": { tone: "professional", formality: "neutral", intent: "inform" },
  "resume-summary": { tone: "confident", formality: "formal", intent: "persuade" },
  "cover-letter": { tone: "professional", formality: "formal", intent: "persuade" },
  "linkedin-summary": { tone: "confident", formality: "neutral", intent: "inform" },
};

export function getTemplate(id: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}

export function templatesForMode(mode: WritingMode): DocumentTemplate[] {
  return DOCUMENT_TEMPLATES.filter((t) => t.mode === mode);
}

export function featuredTemplates(): DocumentTemplate[] {
  return DOCUMENT_TEMPLATES.filter((t) => t.featured).slice(0, 3);
}

export function goalsForTemplate(template: DocumentTemplate): WritingGoals {
  return {
    ...PRESET_GOALS[template.mode],
    ...TEMPLATE_GOAL_OVERRIDES[template.id],
  };
}

export function templateCategoryLabel(
  templateId: string,
  categoryOrMode?: TemplateCategory | WritingMode
): string {
  const template = getTemplate(templateId);
  const category = template?.category ?? categoryOrMode;
  if (category === "email") return "EMAIL";
  if (category === "career" || category === "resume") return "CAREER";
  if (category === "academic") return "ACADEMIC";
  if (category === "business") return "BUSINESS";
  if (category === "healthcare") return "HEALTHCARE";
  return "GENERAL";
}

export function categorySectionTitle(category: TemplateCategory | "all"): string {
  switch (category) {
    case "email":
      return "Email templates";
    case "academic":
      return "Academic templates";
    case "business":
      return "Business templates";
    case "career":
      return "Career templates";
    case "healthcare":
      return "Healthcare templates";
    case "general":
      return "General templates";
    default:
      return "All templates";
  }
}

/** Partial + category-aware template search (e.g. "email", "resume", "prop"). */
export function templateMatchesQuery(template: DocumentTemplate, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const synonyms: Record<string, TemplateCategory[]> = {
    email: ["email"],
    mail: ["email"],
    academic: ["academic"],
    essay: ["academic"],
    research: ["academic"],
    college: ["academic"],
    business: ["business"],
    proposal: ["business"],
    executive: ["business"],
    project: ["business"],
    career: ["career"],
    resume: ["career"],
    cv: ["career"],
    cover: ["career"],
    linkedin: ["career"],
    job: ["career", "email"],
  };

  for (const [term, cats] of Object.entries(synonyms)) {
    if (q === term || term.startsWith(q) || q.startsWith(term)) {
      if (cats.includes(template.category)) return true;
    }
  }

  const haystack = [
    template.title,
    template.description,
    template.category,
    templateCategoryLabel(template.id, template.category),
    template.mode,
    ...template.title.toLowerCase().split(/\s+/),
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes(q)) return true;
  return q.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}
