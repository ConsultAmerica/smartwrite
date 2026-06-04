import "./EmptyState.css";

interface Props {
  icon?: string;
  title: string;
  message: string;
}

export default function EmptyState({ icon = "✦", title, message }: Props) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
