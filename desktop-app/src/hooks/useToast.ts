import { useCallback, useRef, useState } from "react";
import type { ToastMessage } from "../components/Toast";

export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((text: string, type: ToastMessage["type"] = "info") => {
    const id = ++idRef.current;
    setMessages([{ id, text, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, showToast, dismissToast };
}
