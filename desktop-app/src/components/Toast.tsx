import { useEffect } from "react";
import "./Toast.css";

export interface ToastMessage {
  id: number;
  text: string;
  type?: "info" | "success" | "error";
}

interface Props {
  messages: ToastMessage[];
  onDismiss: (id: number) => void;
}

export default function Toast({ messages, onDismiss }: Props) {
  return (
    <div className="toast-stack" aria-live="polite">
      {messages.map((m) => (
        <ToastItem key={m.id} message={m} onDismiss={() => onDismiss(m.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  message,
  onDismiss,
}: {
  message: ToastMessage;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`toast toast-${message.type ?? "info"}`} role="status">
      {message.text}
    </div>
  );
}
