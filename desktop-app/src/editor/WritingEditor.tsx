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
  onApplyFromEditor: (issue: GrammarIssue, replacement?: string) => void;
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

/** QuillBot-style underline treatment by issue family. */
function issueMarkStyle(type: string): string {
  switch (type) {
    case "spelling":
      return "wavy";
    case "grammar":
    case "punctuation":
      return "solid";
    case "clarity":
    case "vague_wording":
    case "passive_voice":
    case "long_sentence":
      return "solid";
    case "tone_issue":
    case "casual_wording":
    case "informal":
    case "blunt_wording":
      return "double";
    default:
      return "dotted";
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
      const style = issueMarkStyle(issue.issue_type);
      html += `<mark class="issue-mark mark-${style}${active}${hovered}" data-id="${issue.id}" style="--mark-color:${color}">${escapeHtml(text.slice(start, end))}</mark>`;
      cursor = end;
    }
  }
  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }
  return html.replace(/\n/g, "<br/>");
}

function issueAtPoint(
  textarea: HTMLTextAreaElement,
  clientX: number,
  clientY: number
): HTMLElement | null {
  const prev = textarea.style.pointerEvents;
  textarea.style.pointerEvents = "none";
  const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  textarea.style.pointerEvents = prev;
  return el?.closest?.("[data-id]") as HTMLElement | null;
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
  const leaveTimer = useRef<number | null>(null);
  const pinnedRef = useRef(false);
  const [popup, setPopup] = useState<{
    issue: GrammarIssue;
    top: number;
    left: number;
    pinned: boolean;
  } | null>(null);

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

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const hidePopup = useCallback(() => {
    if (pinnedRef.current) return;
    setPopup(null);
    onIssueHover(null);
  }, [onIssueHover]);

  const showIssuePopup = useCallback(
    (issue: GrammarIssue, markEl: HTMLElement, pinned = false) => {
      const container = editorRef.current?.getBoundingClientRect();
      if (!container) return;
      const rect = markEl.getBoundingClientRect();
      pinnedRef.current = pinned;
      onIssueHover(issue.id);
      setPopup({
        issue,
        top: Math.min(rect.bottom - container.top + 8, container.height - 180),
        left: Math.max(8, Math.min(rect.left - container.left, container.width - 280)),
        pinned,
      });
    },
    [onIssueHover]
  );

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
      // Open popover near the selected mark after scroll paints
      window.requestAnimationFrame(() => {
        const mark = backdropRef.current?.querySelector(
          `[data-id="${CSS.escape(issue.id)}"]`
        ) as HTMLElement | null;
        if (mark) showIssuePopup(issue, mark, true);
      });
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
    // Close pinned popover when the issue list changes away from that issue
    if (!popup) return;
    if (!issues.some((i) => i.id === popup.issue.id)) {
      pinnedRef.current = false;
      setPopup(null);
    }
  }, [issues, popup]);

  return (
    <div className="writing-editor" ref={editorRef}>
      <div className="editor-legend" aria-label="Suggestion colors">
        <span className="legend-item legend-correctness">Spelling / grammar</span>
        <span className="legend-item legend-clarity">Clarity</span>
        <span className="legend-item legend-tone">Tone</span>
        <span className="legend-item legend-style">Style</span>
      </div>

      <div className="editor-surface">
        <div className="editor-backdrop" ref={backdropRef} aria-hidden="true">
          <div
            className="editor-highlight"
            dangerouslySetInnerHTML={{ __html: highlightHtml || "&nbsp;" }}
          />
        </div>
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          aria-label="Document editor — type or paste text to check"
          value={text}
          onChange={(e) => {
            pinnedRef.current = false;
            setPopup(null);
            onChange(e.target.value);
          }}
          onScroll={syncScroll}
          placeholder="Paste or start typing — suggestions appear as you write"
          spellCheck={false}
          onMouseMove={(e) => {
            if (pinnedRef.current) return;
            const ta = textareaRef.current;
            if (!ta || !text.trim()) return;
            const mark = issueAtPoint(ta, e.clientX, e.clientY);
            if (!mark?.dataset.id) {
              clearLeaveTimer();
              leaveTimer.current = window.setTimeout(hidePopup, 160);
              return;
            }
            clearLeaveTimer();
            const issue = issues.find((i) => i.id === mark.dataset.id);
            if (!issue) return;
            if (popup?.issue.id === issue.id) return;
            showIssuePopup(issue, mark, false);
          }}
          onMouseLeave={() => {
            if (pinnedRef.current) return;
            clearLeaveTimer();
            leaveTimer.current = window.setTimeout(hidePopup, 220);
          }}
          onClick={(e) => {
            const ta = textareaRef.current;
            if (!ta) return;
            const mark = issueAtPoint(ta, e.clientX, e.clientY);
            if (!mark?.dataset.id) {
              pinnedRef.current = false;
              setPopup(null);
              onIssueHover(null);
              return;
            }
            const issue = issues.find((i) => i.id === mark.dataset.id);
            if (!issue) return;
            onIssueClick(issue);
            showIssuePopup(issue, mark, true);
          }}
        />

        {!text.trim() && emptyOverlay ? (
          <div className="editor-empty-overlay">{emptyOverlay}</div>
        ) : null}

        {popup && (
          <SuggestionPopover
            issue={popup.issue}
            top={popup.top}
            left={popup.left}
            pinned={popup.pinned}
            documentText={text}
            onAccept={(replacement) => {
              onApplyFromEditor(popup.issue, replacement);
              pinnedRef.current = false;
              setPopup(null);
            }}
            onIgnore={() => {
              onIgnoreFromEditor?.(popup.issue);
              pinnedRef.current = false;
              setPopup(null);
            }}
            onAskAgent={
              onAskAgentFromEditor
                ? () => {
                    onAskAgentFromEditor(popup.issue);
                    pinnedRef.current = false;
                    setPopup(null);
                  }
                : undefined
            }
            onClose={() => {
              pinnedRef.current = false;
              setPopup(null);
              onIssueHover(null);
            }}
            onMouseEnterPopover={clearLeaveTimer}
            onMouseLeavePopover={() => {
              if (pinnedRef.current) return;
              clearLeaveTimer();
              leaveTimer.current = window.setTimeout(hidePopup, 180);
            }}
          />
        )}
      </div>

      <footer className="editor-footer">
        <span>{stats.words === 1 ? "1 word" : `${stats.words} words`}</span>
        <span className="sep">|</span>
        <span>
          {stats.sentences} sentence{stats.sentences !== 1 ? "s" : ""}
        </span>
        <span className="sep">|</span>
        <span>Reading time: {stats.readingLabel}</span>
        {visibleIssues.length > 0 && (
          <>
            <span className="sep">|</span>
            <span className="footer-issues">
              {visibleIssues.length} suggestion{visibleIssues.length !== 1 ? "s" : ""}
            </span>
          </>
        )}
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
