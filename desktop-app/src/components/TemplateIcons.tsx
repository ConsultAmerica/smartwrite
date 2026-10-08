import type { ReactNode } from "react";

/** Monochrome template icons — tinted via CSS currentColor. */

interface IconProps {
  className?: string;
}

export function IconEmail({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 7.5l8 5.5 8-5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAcademic({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 9.5L12 5l9 4.5-9 4.5L3 9.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 12v4.2c0 .4.7 1.5 5.5 2.8 4.8-1.3 5.5-2.4 5.5-2.8V12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M21 9.5V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconBusiness({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="8" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3.5 13h17" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconResume({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 16.5c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconHealthcare({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M7 9.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="9" y="7" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const TEMPLATE_ICON_MAP: Record<string, (props: IconProps) => ReactNode> = {
  "professional-email": IconEmail,
  "academic-paragraph": IconAcademic,
  "business-proposal": IconBusiness,
  "resume-summary": IconResume,
  "patient-communication": IconHealthcare,
};

export function TemplateIcon({ id, className }: { id: string; className?: string }) {
  const Icon = TEMPLATE_ICON_MAP[id];
  if (!Icon) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 5.5l1.2 3.6H17l-3 2.2 1.1 3.6L12 12.9 8.9 14.9l1.1-3.6-3-2.2h3.8L12 5.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <Icon className={className} />;
}
