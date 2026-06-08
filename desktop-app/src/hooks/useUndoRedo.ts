import { useCallback, useState } from "react";

const MAX_HISTORY = 80;

interface UndoState {
  stack: string[];
  pointer: number;
}

export function useUndoRedo(initial: string) {
  const [state, setState] = useState<UndoState>({ stack: [initial], pointer: 0 });
  const value = state.stack[state.pointer] ?? initial;

  const push = useCallback((next: string) => {
    setState((s) => {
      const trimmed = s.stack.slice(0, s.pointer + 1);
      if (trimmed[trimmed.length - 1] === next) return s;
      let stack = [...trimmed, next];
      let pointer = stack.length - 1;
      if (stack.length > MAX_HISTORY) {
        stack = stack.slice(stack.length - MAX_HISTORY);
        pointer = stack.length - 1;
      }
      return { stack, pointer };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => ({ ...s, pointer: Math.max(0, s.pointer - 1) }));
  }, []);

  const redo = useCallback(() => {
    setState((s) => ({ ...s, pointer: Math.min(s.stack.length - 1, s.pointer + 1) }));
  }, []);

  const reset = useCallback((next: string) => {
    setState({ stack: [next], pointer: 0 });
  }, []);

  return {
    value,
    setValue: push,
    undo,
    redo,
    reset,
    canUndo: state.pointer > 0,
    canRedo: state.pointer < state.stack.length - 1,
  };
}
