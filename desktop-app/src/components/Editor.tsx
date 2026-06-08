/**
 * Main writing surface — text input, inline highlights, issue popovers.
 * Wraps the low-level WritingEditor implementation.
 */
import { forwardRef } from "react";
import WritingEditor, { type WritingEditorHandle } from "../editor/WritingEditor";
import type { GrammarIssue, SaveStatus } from "../types";

export type EditorHandle = WritingEditorHandle;

export interface EditorProps {
  text: string;
  onChange: (text: string) => void;
  issues: GrammarIssue[];
  visibleIssues: GrammarIssue[];
  activeIssueId: string | null;
  hoveredIssueId: string | null;
  onIssueClick: (issue: GrammarIssue) => void;
  onIssueHover: (issueId: string | null) => void;
  onApplyFromEditor: (issue: GrammarIssue) => void;
  selection: { start: number; end: number };
  saveStatus: SaveStatus;
  onAnalyze?: () => void;
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(props, ref) {
  const { onAnalyze: _onAnalyze, ...editorProps } = props;
  return <WritingEditor ref={ref} {...editorProps} />;
});

export default Editor;
