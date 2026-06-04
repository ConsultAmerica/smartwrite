"""Academic writing mode — formality, structure, informal language."""

from __future__ import annotations

import re

from grammar import GrammarCheckResult, GrammarIssue, _clarity_score_and_suggestions


def _issue(text: str, start: int, end: int, issue_type: str, title: str, message: str, suggestion: str, why: str) -> GrammarIssue:
    return GrammarIssue(
        id=f"academic-{issue_type}-{start}",
        message=message,
        short_message=title,
        issue_title=title,
        problem=text[start:end] if end > start else message[:60],
        suggestion=suggestion,
        why=why,
        offset=start,
        length=max(0, end - start),
        replacements=[suggestion],
        rule_id=f"ACADEMIC_{issue_type.upper()}",
        category="academic",
        issue_type=issue_type,
    )


def _detect_academic_issues(text: str) -> list[GrammarIssue]:
    issues: list[GrammarIssue] = []
    informal = [
        (r"\bkinda\b", "kind of", "Avoid informal contractions in academic writing."),
        (r"\bgotta\b", "must", "Use formal modal verbs in academic tone."),
        (r"\bsuper\b", "highly", "Replace informal intensifiers with formal alternatives."),
        (r"\ba lot of\b", "numerous", "Academic writing prefers precise quantifiers."),
        (r"\bdon't\b", "do not", "Avoid contractions in formal academic text."),
        (r"\bcan't\b", "cannot", "Avoid contractions in formal academic text."),
        (r"\bshow nothing\b", "demonstrate no significant", "Academic phrasing should be precise and formal."),
        (r"\bwe gotta\b", "we must", "Use formal obligation language."),
    ]
    for pattern, suggestion, why in informal:
        for m in re.finditer(pattern, text, re.I):
            issues.append(
                _issue(
                    text,
                    m.start(),
                    m.end(),
                    "informal",
                    "Informal Wording",
                    "Replace informal language with academic tone.",
                    suggestion,
                    why,
                )
            )

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
    for sentence in sentences:
        if len(sentence.split()) > 30:
            idx = text.find(sentence[:40])
            if idx >= 0:
                issues.append(
                    _issue(
                        text,
                        idx,
                        idx + len(sentence),
                        "long_sentence",
                        "Clarity",
                        "Long academic sentence — consider splitting for readability.",
                        "Divide into two sentences with clear subject and conclusion.",
                        "Complex ideas are easier to follow in shorter sentences.",
                    )
                )
    return issues[:8]


async def check_academic(text: str, user_dictionary: list[str] | None = None) -> GrammarCheckResult:
    del user_dictionary
    if not text.strip():
        return GrammarCheckResult(issues=[], grammar_score=100, issue_count=0, clarity_score=100, clarity_suggestions=[])

    issues = _detect_academic_issues(text)
    clarity_score, clarity_suggestions = _clarity_score_and_suggestions(text)
    penalty = len(issues) * 9
    grammar = max(45, min(99, 100 - penalty))
    return GrammarCheckResult(
        issues=issues,
        grammar_score=grammar,
        issue_count=len(issues),
        clarity_score=max(50, clarity_score - len(issues) * 3),
        clarity_suggestions=clarity_suggestions,
    )


def academic_scores_from_result(result: GrammarCheckResult) -> dict:
    return {
        "writing_mode": "academic",
        "tone": "Academic",
        "professionalism_score": result.grammar_score,
        "clarity_score": result.clarity_score,
        "issue_count": result.issue_count,
    }
