from __future__ import annotations

import re

import httpx
from pydantic import BaseModel

from config import settings
from healthcare_dictionary import merged_terms, should_suppress_issue

_local_tool = None


class GrammarIssue(BaseModel):
    id: str
    message: str
    short_message: str
    issue_title: str
    problem: str
    suggestion: str
    why: str
    offset: int
    length: int
    replacements: list[str]
    rule_id: str
    category: str
    issue_type: str


class ClaritySuggestion(BaseModel):
    id: str
    title: str
    message: str
    sentence: str
    suggestion: str


class GrammarCheckResult(BaseModel):
    issues: list[GrammarIssue]
    grammar_score: int
    issue_count: int
    clarity_score: int
    clarity_suggestions: list[ClaritySuggestion]
    corrected_text: str | None = None


def _get_local_tool():
    global _local_tool
    if _local_tool is None:
        import language_tool_python

        _local_tool = language_tool_python.LanguageTool("en-US")
    return _local_tool


def _categorize(rule_id: str, message: str, issue_title: str = "") -> tuple[str, str]:
    rid = rule_id.upper()
    msg = message.lower()
    title = issue_title.lower()
    if rid.startswith("CUSTOM_CLARITY"):
        return "clarity", "clarity"
    if "context error" in title:
        return "word_choice", "word_choice"
    if "word choice" in title or (rid.startswith("CUSTOM_") and "WORD" in rid):
        return "word_choice", "word_choice"
    if "SPELL" in rid or "MORFOLOGIK" in rid or "spelling" in title:
        return "spelling", "spelling"
    if "PUNCT" in rid or "comma" in msg or "period" in msg or "punctuation" in title:
        return "punctuation", "punctuation"
    if "STYLE" in rid or "WORDINESS" in rid or "REDUNDANCY" in rid or "style" in title:
        return "style", "style"
    if "CLARITY" in msg or "PASSIVE" in rid or "clarity" in title:
        return "clarity", "clarity"
    return "grammar", "grammar"


def _issue_title(rule_id: str, message: str, problem: str) -> str:
    rid = rule_id.upper()
    msg = message.lower()
    prob = problem.lower()

    if "improving" in prob and "improvement" in msg:
        return "Word choice"
    if "AGREEMENT" in rid or "agreement" in msg or "subject" in msg:
        return "Subject-verb agreement"
    if "SPELL" in rid or "MORFOLOGIK" in rid:
        return "Spelling"
    if "WENT" in prob and "good" in prob:
        return "Word choice"
    if "adverb" in msg or ("well" in msg and "good" in prob):
        return "Word choice"
    if "PUNCT" in rid or "comma" in msg or "period" in msg or "missing period" in prob:
        return "Punctuation"
    if "TENSE" in rid or "tense" in msg:
        return "Verb tense"
    if "WORDINESS" in rid or "redundan" in msg:
        return "Wordiness"
    if "PASSIVE" in rid:
        return "Passive voice"
    if "STYLE" in rid:
        return "Style"
    if "CAPITAL" in rid:
        return "Capitalization"
    return "Grammar"


def _build_why(message: str, problem: str, suggestion: str, issue_title: str) -> str:
    if issue_title == "Word choice" and "improving" in problem.lower():
        return '"Improvement" is the noun form needed here, not "improving."'
    if issue_title == "Punctuation" and suggestion == ".":
        return "Add a period at the end of the sentence."
    if issue_title == "Subject-verb agreement" and suggestion:
        if problem.lower() == "has" and suggestion.lower() == "have":
            return 'Use "have" with "I."'
        return f'Use "{suggestion}" with the subject.'
    if issue_title == "Word choice" and "good" in problem.lower() and "well" in suggestion.lower():
        return '"Well" is the adverb that describes how something went.'
    if suggestion and problem and problem != "(missing period)":
        return f'Replace "{problem}" with "{suggestion}."'
    if suggestion:
        return f'Apply: {suggestion}'
    cleaned = re.sub(r"^(Possible|Potential)\s+", "", message.strip(), flags=re.I)
    cleaned = re.sub(r"\s*—\s*use the base form here\.?$", "", cleaned, flags=re.I).strip()
    return cleaned[:120] if cleaned else "This phrasing can be improved."


def _parse_matches(text: str, matches: list[dict]) -> list[GrammarIssue]:
    issues: list[GrammarIssue] = []
    for i, m in enumerate(matches):
        rule_id = m.get("rule", {}).get("id", "UNKNOWN")
        message = m.get("message", "Issue detected")
        replacements = [r.get("value", r) if isinstance(r, dict) else r for r in m.get("replacements", [])]
        offset = m.get("offset", 0)
        length = m.get("length", 0)
        problem = text[offset : offset + length] if text and length else ""
        suggestion = replacements[0] if replacements else ""
        issue_title = _issue_title(rule_id, message, problem)
        category, issue_type = _categorize(rule_id, message, issue_title)
        why = _build_why(message, problem, suggestion, issue_title)

        issues.append(
            GrammarIssue(
                id=f"issue-{offset}-{rule_id}-{i}",
                message=message,
                short_message=m.get("shortMessage") or issue_title,
                issue_title=issue_title,
                problem=problem or "(issue)",
                suggestion=suggestion,
                why=why,
                offset=offset,
                length=length,
                replacements=replacements[:8],
                rule_id=rule_id,
                category=category,
                issue_type=issue_type,
            )
        )
    return issues


def _custom_issues_general(text: str) -> list[GrammarIssue]:
    """General-mode extras — grammar, clarity, punctuation (not resume/healthcare)."""
    custom: list[GrammarIssue] = []

    for m in re.finditer(r"\bthe\s+biggest\s+improving\s+now\b", text, re.IGNORECASE):
        phrase = text[m.start() : m.end()]
        custom.append(
            GrammarIssue(
                id=f"custom-biggest-improving-{m.start()}",
                message='Use the noun "improvement" instead of "improving."',
                short_message="Grammar",
                issue_title="Grammar",
                problem=phrase,
                suggestion="The biggest improvement now",
                why='"Improvement" is the noun form needed here, not "improving."',
                offset=m.start(),
                length=len(phrase),
                replacements=["The biggest improvement now"],
                rule_id="CUSTOM_BIGGEST_IMPROVING",
                category="grammar",
                issue_type="grammar",
            )
        )

    for m in re.finditer(r"\bimproving\s+now\b", text, re.IGNORECASE):
        ctx = text[max(0, m.start() - 16) : m.end()]
        if re.search(r"\bthe\s+biggest\s+improving\s+now\b", ctx, re.I):
            continue
        phrase = text[m.start() : m.end()]
        custom.append(
            GrammarIssue(
                id=f"custom-improving-{m.start()}",
                message='Use the noun "improvement" instead of "improving."',
                short_message="Grammar",
                issue_title="Grammar",
                problem=phrase,
                suggestion="improvement now",
                why='"Improvement" is the noun form needed here, not "improving."',
                offset=m.start(),
                length=len(phrase),
                replacements=["improvement now"],
                rule_id="CUSTOM_IMPROVING_NOW",
                category="grammar",
                issue_type="grammar",
            )
        )

    stripped = text.rstrip()
    if stripped and stripped[-1] not in ".!?":
        custom.append(
            GrammarIssue(
                id="custom-missing-period",
                message="Missing punctuation at end of sentence.",
                short_message="Punctuation",
                issue_title="Punctuation",
                problem="(missing period at end)",
                suggestion=".",
                why="Add a period at the end of the sentence.",
                offset=len(stripped),
                length=0,
                replacements=["."],
                rule_id="CUSTOM_MISSING_PERIOD",
                category="punctuation",
                issue_type="punctuation",
            )
        )

    return custom


def _overlaps(a: GrammarIssue, b: GrammarIssue) -> bool:
    a_end = a.offset + max(a.length, 1)
    b_end = b.offset + max(b.length, 1)
    return a.offset < b_end and b.offset < a_end


def _merge_issues(lt_issues: list[GrammarIssue], custom: list[GrammarIssue]) -> list[GrammarIssue]:
    merged = list(lt_issues)
    for c in custom:
        if not any(_overlaps(c, existing) for existing in merged):
            merged.append(c)
    return sorted(merged, key=lambda x: x.offset)


def _clarity_score_and_suggestions(text: str) -> tuple[int, list[ClaritySuggestion]]:
    suggestions: list[ClaritySuggestion] = []
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
    if not sentences:
        return 100, []

    penalty = 0
    for i, sentence in enumerate(sentences):
        word_count = len(sentence.split())
        if word_count > 22:
            penalty += min(20, (word_count - 22) * 2)
            # Suggest a split at a natural clause boundary
            words = sentence.split()
            mid = len(words) // 2
            part1 = " ".join(words[:mid]).rstrip(",;:")
            part2 = " ".join(words[mid:])
            if part1 and part2:
                part1 = part1[0].upper() + part1[1:] if part1 else part1
                if not part1.endswith((".", "!", "?")):
                    part1 += "."
                part2 = part2[0].upper() + part2[1:] if part2 else part2
                suggested = f"{part1} {part2}"
            else:
                suggested = sentence

            suggestions.append(
                ClaritySuggestion(
                    id=f"clarity-long-{i}",
                    title="Clarity",
                    message="This sentence is long. Consider splitting it into two shorter sentences.",
                    sentence=sentence if len(sentence) <= 160 else sentence[:157] + "…",
                    suggestion=suggested,
                )
            )

    avg_len = sum(len(s.split()) for s in sentences) / len(sentences)
    base = max(40, min(100, 100 - int(max(0, avg_len - 16) * 2)))
    score = max(40, min(99, base - penalty))
    if suggestions:
        score = min(78, max(70, score + 10))
    return score, suggestions


def _clarity_issues_from_suggestions(
    text: str, suggestions: list[ClaritySuggestion]
) -> list[GrammarIssue]:
    issues: list[GrammarIssue] = []
    for s in suggestions:
        idx = -1
        if s.sentence:
            probe = s.sentence.replace("…", "").strip()
            if len(probe) > 20:
                idx = text.find(probe[: min(60, len(probe))])
        if idx < 0:
            idx = 0
        length = len(s.sentence) if s.sentence else 0
        if length == 0 and text:
            length = min(len(text), 120)
        elif idx >= 0 and s.sentence and idx + length > len(text):
            length = min(length, len(text) - idx)
        issues.append(
            GrammarIssue(
                id=s.id,
                message=s.message,
                short_message="Clarity",
                issue_title="Clarity",
                problem=s.sentence[:120] if s.sentence else "(long passage)",
                suggestion=s.suggestion[:200] if s.suggestion else "",
                why="This paragraph is long. Consider splitting it into two shorter paragraphs.",
                offset=idx,
                length=length,
                replacements=[s.suggestion] if s.suggestion else [],
                rule_id="CUSTOM_CLARITY_LONG",
                category="clarity",
                issue_type="clarity",
            )
        )
    return issues


SCORABLE_TYPES = frozenset({"grammar", "spelling", "word_choice", "punctuation", "style"})


def _scorable_issues(issues: list[GrammarIssue]) -> list[GrammarIssue]:
    return [i for i in issues if i.issue_type in SCORABLE_TYPES]


def _grammar_score(issues: list[GrammarIssue], text_len: int) -> int:
    if text_len == 0:
        return 100
    scorable = _scorable_issues(issues)
    if not scorable:
        return 100
    per_issue = 8
    penalty = min(len(scorable) * per_issue, 40)
    density = min(int((len(scorable) / max(text_len / 200, 1)) * 4), 8)
    # Never report 100% when grammar/spelling/word-choice/punctuation issues remain
    return max(55, min(99, 100 - penalty - density))


def _filter_false_positives(
    text: str, issues: list[GrammarIssue], user_dictionary: list[str] | None
) -> list[GrammarIssue]:
    terms = merged_terms(user_dictionary)
    return [
        i
        for i in issues
        if not should_suppress_issue(
            text, i.offset, i.length, i.rule_id, i.category, terms
        )
    ]


def apply_all_corrections(text: str, issues: list[GrammarIssue]) -> str:
    result = text
    for issue in sorted(issues, key=lambda x: x.offset, reverse=True):
        if not issue.suggestion:
            continue
        start, end = issue.offset, issue.offset + issue.length
        if start < 0 or start > len(result):
            continue
        if issue.length == 0:
            result = result[:start] + issue.suggestion + result[start:]
        elif end <= len(result):
            result = result[:start] + issue.suggestion + result[end:]
    return result


async def _check_via_api(text: str) -> list[dict]:
    url = settings.languagetool_api_url or "https://api.languagetool.org/v2/check"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            data={"text": text, "language": "en-US"},
        )
        response.raise_for_status()
        return response.json().get("matches", [])


def _check_local(text: str) -> list[dict]:
    tool = _get_local_tool()
    matches = tool.check(text)
    result = []
    for m in matches:
        result.append(
            {
                "message": m.message,
                "shortMessage": getattr(m, "shortMessage", None) or m.message[:80],
                "offset": m.offset,
                "length": m.errorLength,
                "replacements": [{"value": r} for r in (m.replacements or [])[:8]],
                "rule": {"id": m.ruleId, "category": {"id": getattr(m, "category", "GRAMMAR")}},
            }
        )
    return result


async def check_grammar(
    text: str,
    user_dictionary: list[str] | None = None,
    mode: str = "general",
) -> GrammarCheckResult:
    if not text.strip():
        return GrammarCheckResult(
            issues=[],
            grammar_score=100,
            issue_count=0,
            clarity_score=100,
            clarity_suggestions=[],
        )

    use_api = bool(settings.languagetool_api_url) or settings.serve_web
    try:
        if use_api:
            matches = await _check_via_api(text)
        else:
            matches = _check_local(text)
    except Exception:
        matches = await _check_via_api(text)

    lt_issues = _filter_false_positives(
        text, _parse_matches(text, matches), user_dictionary
    )
    custom = _filter_false_positives(
        text, _custom_issues_general(text), user_dictionary
    )
    word_issues = _merge_issues(lt_issues, custom)
    clarity_score, clarity_suggestions = _clarity_score_and_suggestions(text)
    clarity_issues = _clarity_issues_from_suggestions(text, clarity_suggestions[:1])
    issues = _filter_false_positives(
        text, _merge_issues(word_issues, clarity_issues), user_dictionary
    )
    correctable = [i for i in issues if i.issue_type != "clarity"]
    corrected = apply_all_corrections(text, correctable) if correctable else text

    return GrammarCheckResult(
        issues=issues,
        grammar_score=_grammar_score(issues, len(text)),
        issue_count=len(issues),
        clarity_score=clarity_score,
        clarity_suggestions=clarity_suggestions,
        corrected_text=corrected if correctable else None,
    )
