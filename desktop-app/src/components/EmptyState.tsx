import "./EmptyState.css";

export interface EmptyStarter {
  id: string;
  label: string;
}

interface Props {
  icon?: string;
  title: string;
  message: string;
  onStart?: () => void;
  starters?: EmptyStarter[];
  onStarter?: (id: string) => void;
  variant?: "panel" | "hero";
  imageSrc?: string;
}

export default function EmptyState({
  title,
  message,
  onStart,
  starters,
  onStarter,
  variant = "panel",
  imageSrc = "/images/empty-ready.svg",
}: Props) {
  return (
    <div className={`empty-state empty-state--${variant}`}>
      <div className="empty-state-inner">
        {variant === "hero" && (
          <div className="empty-hero-art" aria-hidden="true">
            <img src={imageSrc} alt="" width={140} height={105} />
          </div>
        )}
        <strong>{title}</strong>
        <p>{message}</p>
        {onStart && (
          <button type="button" className="empty-start" onClick={onStart}>
            Start writing
          </button>
        )}
        {starters && starters.length > 0 && (
          <div className="empty-starters" role="group" aria-label="Starter templates">
            {starters.map((s) => (
              <button key={s.id} type="button" onClick={() => onStarter?.(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
