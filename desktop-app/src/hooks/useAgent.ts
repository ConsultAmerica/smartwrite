import { useCallback, useState } from "react";
import { runAgent } from "../api/agent";
import type { AgentResponse, AgentType } from "../types";

export function useAgent(type: AgentType) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (text: string, options: Record<string, unknown> = {}, documentId?: number | null) => {
      if (!text.trim()) {
        setError("Add some text before running this agent.");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await runAgent(type, text, options, documentId);
        setResult(res);
        return res;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Agent failed.";
        setError(message);
        setResult(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [type]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, result, error, run, reset };
}
