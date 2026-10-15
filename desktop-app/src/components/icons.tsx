/** Inline icons — avoid <img src="/images/..."> so Chrome never shows broken assets if static files 404. */

type IconProps = { size?: number; className?: string };

export function IconHome({ size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 9.2L10 3.5l6.5 5.7V16a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V9.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 17.5v-5h4v5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconDocs({ size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="2.5" width="12" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 7h6M7 10.5h6M7 14h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconTemplates({ size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconDocThumb({ size = 36, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="10" fill="#F3F4F6" />
      <rect
        x="16"
        y="12"
        width="32"
        height="40"
        rx="4"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="1.5"
      />
      <path d="M36 12v10a2 2 0 0 0 2 2h10" stroke="#D1D5DB" strokeWidth="1.5" />
      <rect x="22" y="28" width="18" height="2.5" rx="1.25" fill="#E5E7EB" />
      <rect x="22" y="34" width="14" height="2.5" rx="1.25" fill="#E5E7EB" />
      <rect x="22" y="40" width="16" height="2.5" rx="1.25" fill="#E5E7EB" />
    </svg>
  );
}
