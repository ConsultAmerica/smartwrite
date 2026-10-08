import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import SuggestionPopover from "../components/SuggestionPopover";
import type { GrammarIssue, SaveStatus } from "../types";
import { getTextStats } from "../utils/textStats";
import "./WritingEditor.css";

export interface WritingEditorHandle {
  scrollToIssue: (issue: GrammarIssue) => void;
  focusEditor: () => void;
  selectParagraph: () => { start: number; end: number; text: string } | null;
}

interface Props {
  text: string;
  onChange: (text: string) => void;
  issues: GrammarIssue[];
  visibleIssues: GrammarIssue[];
  activeIssueId: string | null;
  hoveredIssueId: string | null;
  onIssueClick: (issue: GrammarIssue) => void;
  onIssueHover: (issueId: string | null) => void;
  onApplyFromEditor: (issue: GrammarIssue) => void;
  onIgnoreFromEditor?: (issue: GrammarIssue) => void;
  onAskAgentFromEditor?: (issue: GrammarIssue) => void;
  selection: { start: number; end: number };
  saveStatus: SaveStatus;
  emptyOverlay?: ReactNode;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function issueColor(type: string): string {
  switch (type) {
    case "spelling":
    case "grammar":
    case "punctuation":
      return "var(--highlight-grammar)";
    case "clarity":
    case "vague_wording":
    case "passive_voice":
    case "long_sentence":
      return "var(--highlight-clarity)";
    case "tone_issue":
    case "casual_wording":
    case "informal":
    case "blunt_wording":
      return "var(--highlight-tone)";
    case "style":
    case "word_choice":
    case "conciseness":
    case "weak_verb":
    case "repeated_word":
      return "var(--highlight-engagement)";
    default:
      return "var(--highlight-grammar)";
  }
}

function buildHighlightHtml(
  text: string,
  issues: GrammarIssue[],
  activeId: string | null,
  hoveredId: string | null
): string {
  if (!text) return "";
  const sorted = [...issues].sort((a, b) => a.offset - b.offset);
  let html = "";
  let cursor = 0;

  for (const issue of sorted) {
    const start = Math.max(issue.offset, cursor);
    const end = Math.min(issue.offset + issue.length, text.length);
    if (start > cursor) {
      html += escapeHtml(text.slice(cursor, start));
    }
    if (end > start) {
      const active = issue.id === activeId ? " active" : "";
      const hovered = issue.id === hoveredId ? " hovered" : "";
      const color = issueColor(issue.issue_type);
      html += `<mark class="issue-mark${active}${hovered}" data-id="${issue.id}" style="--mark-color:${color}">${escapeHtml(text.slice(start, end))}</mark>`;
      cursor = end;
    }
  }
  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }
  return html.replace(/\n/g, "<br/>");
}

const WritingEditor = forwardRef<WritingEditorHandle, Props>(function WritingEditor(
  {
    text,
    onChange,
    issues,
    visibleIssues,
    activeIssueId,
    hoveredIssueId,
    onIssueClick,
    onIssueHover,
    onApplyFromEditor,
    onIgnoreFromEditor,
    onAskAgentFromEditor,
    selection,
    saveStatus,
    emptyOverlay,
  },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<{ issue: GrammarIssue; top: number; left: number } | null>(
    null
  );

  const stats = useMemo(() => getTextStats(text), [text]);

  const highlightHtml = useMemo(
    () => buildHighlightHtml(text, visibleIssues, activeIssueId, hoveredIssueId),
    [text, visibleIssues, activeIssueId, hoveredIssueId]
  );

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const bd = backdropRef.current;
    if (ta && bd) {
      bd.scrollTop = ta.scrollTop;
      bd.scrollLeft = ta.scrollLeft;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToIssue(issue: GrammarIssue) {
      const ta = textareaRef.current;
      if (!ta) return;
      const before = text.slice(0, issue.offset);
      const lines = before.split("\n").length - 1;
      const lineHeight = 26;
      ta.focus();
      ta.setSelectionRange(issue.offset, issue.offset + issue.length);
      ta.scrollTop = Math.max(0, lines * lineHeight - ta.clientHeight / 3);
      syncScroll();
    },
    focusEditor() {
      textareaRef.current?.focus();
    },
    selectParagraph() {
      const textarea = textareaRef.current;
      if (!textarea || !text.trim()) return null;

      const selectionStart = textarea.selectionStart;
      const paragraphBreak = /\n[ \t]*\n+/g;
      let start = 0;
      let end = text.length;
      for (const match of text.matchAll(paragraphBreak)) {
        const boundary = match.index ?? 0;
        const afterBoundary = boundary + match[0].length;
        if (afterBoundary <= selectionStart) {
          start = afterBoundary;
        } else if (boundary >= selectionStart) {
          end = boundary;
          break;
        }
      }

      while (start < end && /\s/.test(text[start])) start += 1;
      while (end > start && /\s/.test(text[end - 1])) end -= 1;
      if (end <= start) return null;

      textarea.focus();
      textarea.setSelectionRange(start, end);
      return { start, end, text: text.slice(start, end) };
    },
  }));

  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-id]") as HTMLElement | null;
      if (!target?.dataset.id) return;
      const issue = issues.find((i) => i.id === target.dataset.id);
      if (issue) onIssueClick(issue);
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-id]") as HTMLElement | null;
      if (!target?.dataset.id) {
        setPopup(null);
        onIssueHover(null);
        return;
      }
      const issue = issues.find((i) => i.id === target.dataset.id);
      if (!issue) return;
      onIssueHover(issue.id);
      const rect = target.getBoundingClientRect();
      const container = editorRef.current?.getBoundingClientRect();
      if (!container) return;
      setPopup({
        issue,
        top: rect.bottom - container.top + 6,
        left: Math.min(rect.left - container.left, container.width - 220),
      });
    };

    const onMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest(".issue-popup") || related?.closest(".issue-mark")) return;
      setPopup(null);
      onIssueHover(null);
    };

    backdrop.addEventListener("click", onClick);
    backdrop.addEventListener("mouseover", onMouseOver);
    backdrop.addEventListener("mouseout", onMouseOut);
    return () => {
      backdrop.removeEventListener("click", onClick);
      backdrop.removeEventListener("mouseover", onMouseOver);
      backdrop.removeEventListener("mouseout", onMouseOut);
    };
  }, [issues, onIssueClick, onIssueHover, syncScroll]);

  return (
    <div className="writing-editor" ref={editorRef}>
      <div className="editor-backdrop" ref={backdropRef} aria-hidden="true">
        <div className="editor-highlight" dangerouslySetInnerHTML={{ __html: highlightHtml || "&nbsp;" }} />
      </div>
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        aria-label="Document editor"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder=""
        spellCheck={false}
      />

      {!text.trim() && emptyOverlay ? (
        <div className="editor-empty-overlay">{emptyOverlay}</div>
      ) : null}

      {popup && (
        <SuggestionPopover
          issue={popup.issue}
          top={popup.top}
          left={popup.left}
          onAccept={() => {
            onApplyFromEditor(popup.issue);
            setPopup(null);
          }}
          onIgnore={() => {
            onIgnoreFromEditor?.(popup.issue);
            setPopup(null);
          }}
          onAskAgent={
            onAskAgentFromEditor
              ? () => {
                  onAskAgentFromEditor(popup.issue);
                  setPopup(null);
                }
              : undefined
          }
          onClose={() => {
            setPopup(null);
            onIssueHover(null);
          }}
        />
      )}

      <footer className="editor-footer">
        <span>{stats.words === 1 ? "1 word" : `${stats.words} words`}</span>
        <span className="sep">|</span>
        <span>{stats.sentences} sentence{stats.sentences !== 1 ? "s" : ""}</span>
        <span className="sep">|</span>
        <span>Reading time: {stats.readingLabel}</span>
        <span className="sep">|</span>
        <span className={`save-status ${saveStatus}`}>
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "offline"
                ? "Offline"
                : saveStatus === "error"
                  ? "Save failed"
                  : saveStatus === "retrying"
                    ? "Retrying…"
                    : "Unsaved"}
        </span>
        {selection.end > selection.start && (
          <>
            <span className="sep">|</span>
            <span>{selection.end - selection.start} selected</span>
          </>
        )}
      </footer>
    </div>
  );
});

export default WritingEditor;
