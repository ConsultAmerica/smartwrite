import type { DocumentTemplate, WritingMode } from "../types";

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "professional-email",
    title: "Professional Email",
    description: "Polite follow-up with greeting and closing",
    mode: "email",
    content:
      "Hello,\n\nI hope this message finds you well. I am writing to follow up on our previous conversation regarding the project timeline.\n\nCould you please share an update when convenient?\n\nThank you for your time.\n\nBest regards,",
  },
  {
    id: "job-application",
    title: "Job Application Message",
    description: "Concise application note to a hiring manager",
    mode: "email",
    content:
      "Dear Hiring Manager,\n\nI am excited to apply for the role. I have experience building user-focused products and collaborating with cross-functional teams.\n\nI would welcome the opportunity to discuss how my skills align with your needs.\n\nSincerely,",
  },
  {
    id: "resume-summary",
    title: "Resume Summary",
    description: "Strong opening summary for a resume",
    mode: "resume",
    content:
      "Results-driven software engineer with 5+ years building responsive web applications. Skilled in React, TypeScript, and API design. Delivered features that improved user engagement and reduced support tickets.",
  },
  {
    id: "linkedin-about",
    title: "LinkedIn About Section",
    description: "Professional profile summary",
    mode: "business",
    content:
      "I help teams ship reliable software products. I specialize in frontend architecture, writing clear documentation, and mentoring junior developers. Open to connecting about product engineering and developer experience.",
  },
  {
    id: "academic-paragraph",
    title: "Academic Paragraph",
    description: "Formal academic writing sample",
    mode: "academic",
    content:
      "This study examines the relationship between digital literacy and academic performance among undergraduate students. The findings suggest that structured training programs significantly improve research skills and written communication outcomes.",
  },
  {
    id: "business-proposal",
    title: "Business Proposal",
    description: "Client-facing proposal intro",
    mode: "business",
    content:
      "Our team proposes a phased implementation plan designed to reduce operational costs while improving service quality. Phase one focuses on process automation; phase two expands analytics and reporting for leadership.",
  },
  {
    id: "patient-communication",
    title: "Patient Communication",
    description: "Clear healthcare outreach message",
    mode: "healthcare",
    content:
      "Your care team reviewed your recent lab results and recommends scheduling a follow-up visit within two weeks. Please contact our clinic to confirm an appointment time that works for you.",
  },
  {
    id: "support-reply",
    title: "Customer Support Reply",
    description: "Empathetic support response",
    mode: "business",
    content:
      "Thank you for reaching out. I understand how frustrating this issue must be. I have reviewed your account and applied a fix. Please refresh the page and let us know if anything else comes up.",
  },
];

export function getTemplate(id: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}

export function templatesForMode(mode: WritingMode): DocumentTemplate[] {
  return DOCUMENT_TEMPLATES.filter((t) => t.mode === mode);
}
