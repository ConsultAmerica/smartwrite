/**
 * Center writing canvas — toolbar, inline highlights, suggestion popovers.
 */
import { forwardRef } from "react";
import WritingEditor, { type WritingEditorHandle } from "../editor/WritingEditor";
import Toolbar from "./Toolbar";
import type { GrammarIssue, SaveStatus, ToneMode } from "../types";
import "./Editor.css";

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
  onIgnoreFromEditor: (issue: GrammarIssue) => void;
  onAskAgentFromEditor?: (issue: GrammarIssue) => void;
  selection: { start: number; end: number };
  saveStatus: SaveStatus;
  toolbarLoading?: boolean;
  onToolbarPreset: (mode: ToneMode, label: string) => void;
  documentHasText?: boolean;
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    toolbarLoading,
    onToolbarPreset,
    documentHasText = true,
    onIgnoreFromEditor,
    onAskAgentFromEditor,
    ...editorProps
  },
  ref
) {
  return (
    <div className="editor-canvas">
      <Toolbar
        disabled={!documentHasText}
        loading={toolbarLoading}
        onPreset={onToolbarPreset}
      />
      <div className="editor-canvas-inner">
        <WritingEditor
          ref={ref}
          {...editorProps}
          onIgnoreFromEditor={onIgnoreFromEditor}
          onAskAgentFromEditor={onAskAgentFromEditor}
        />
      </div>
    </div>
  );
});

export default Editor;
