/**
 * Center writing canvas — selection toolbar, paragraph rewrite, inline highlights.
 */
import { forwardRef, type ReactNode } from "react";
import WritingEditor, { type WritingEditorHandle } from "../editor/WritingEditor";
import ParagraphRewriteControl from "./ParagraphRewriteControl";
import Toolbar from "./Toolbar";
import type { AiRewritePreview, GrammarIssue, SaveStatus, ToneMode } from "../types";
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
  onToolbarPreset: (mode: ToneMode, label: string, instruction?: string) => void;
  onParagraphRewrite: (mode?: ToneMode, label?: string) => void;
  onOpenAI: () => void;
  documentHasText?: boolean;
  paragraphPreview?: AiRewritePreview | null;
  onParagraphReplace?: () => void;
  onParagraphDismiss?: () => void;
  emptyOverlay?: ReactNode;
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    toolbarLoading,
    onToolbarPreset,
    onParagraphRewrite,
    onOpenAI,
    selection,
    documentHasText = true,
    onIgnoreFromEditor,
    onAskAgentFromEditor,
    paragraphPreview = null,
    onParagraphReplace,
    onParagraphDismiss,
    emptyOverlay,
    ...editorProps
  },
  ref
) {
  return (
    <div className="editor-canvas">
      <Toolbar
        disabled={!documentHasText}
        loading={toolbarLoading}
        selectionActive={selection.end > selection.start}
        onPreset={onToolbarPreset}
        onParagraphRewrite={() => onParagraphRewrite()}
        onOpenAI={onOpenAI}
      />
      <ParagraphRewriteControl
        visible={documentHasText}
        loading={Boolean(toolbarLoading)}
        preview={paragraphPreview}
        onRewrite={(mode, label) => onParagraphRewrite(mode, label)}
        onReplace={() => onParagraphReplace?.()}
        onDismiss={() => onParagraphDismiss?.()}
      />
      <div className="editor-canvas-inner">
        <WritingEditor
          ref={ref}
          {...editorProps}
          selection={selection}
          onIgnoreFromEditor={onIgnoreFromEditor}
          onAskAgentFromEditor={onAskAgentFromEditor}
          emptyOverlay={emptyOverlay}
        />
      </div>
    </div>
  );
});

export default Editor;
