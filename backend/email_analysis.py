"""Email mode — professionalism, tone, and structure (not grammar-only)."""

from __future__ import annotations

import re

from grammar import (
    GrammarCheckResult,
    GrammarIssue,
    _clarity_score_and_suggestions,
)

EMAIL_CATEGORIES = {
    "tone_issue": "Tone Issue",
    "casual_wording": "Casual Wording",
    "missing_greeting": "Missing Greeting",
    "missing_closing": "Missing Closing",
    "long_sentence": "Long Sentence",
    "unclear_request": "Unclear Request",
    "weak_cta": "Weak Call-to-Action",
    "blunt_wording": "Blunt Wording",
}


def _issue(
    text: str,
    start: int,
    end: int,
    *,
    issue_type: str,
    message: str,
    suggestion: str,
    why: str,
    replacements: list[str] | None = None,
) -> GrammarIssue:
    title = EMAIL_CATEGORIES.get(issue_type, "Tone Issue")
    phrase = text[start:end] if end > start else message[:80]
    reps = replacements if replacements is not None else ([suggestion] if suggestion else [])
    return GrammarIssue(
        id=f"email-{issue_type}-{start}",
        message=message,
        short_message=title,
        issue_title=title,
        problem=phrase,
        suggestion=suggestion,
        why=why,
        offset=start,
        length=max(0, end - start),
        replacements=reps,
        rule_id=f"EMAIL_{issue_type.upper()}",
        category="email",
        issue_type=issue_type,
    )


def _detect_email_issues(text: str) -> list[GrammarIssue]:
    issues: list[GrammarIssue] = []
    lower = text.lower().strip()
    if not lower:
        return issues

    patterns: list[tuple[str, str, str, str, str]] = [
        (
            r"\bsend\s+me\s+(?:the\s+)?\w+",
            "blunt_wording",
            "Soften direct demands for professional email.",
            "Could you please send me the file when you get a chance?",
            "The revised sentence sounds more polite and professional.",
        ),
        (
            r"\bhey\b(?!\s+(?:there|team))",
            "casual_wording",
            "Opening with “hey” can sound too informal for professional email.",
            "Hello",
            "Use a professional greeting such as Hello or Dear [Name].",
        ),
        (
            r"\b(lol|gonna|wanna|yeah|thanks\s*$)\b",
            "casual_wording",
            "Replace casual language with professional wording.",
            "Thank you for your time.",
            "Professional emails avoid slang and overly casual phrasing.",
        ),
        (
            r"\blet\s+me\s+know\s+when\s+you\s+can\b",
            "weak_cta",
            "Strengthen the call-to-action with a clear next step.",
            "Please let me know by Friday if you are available to discuss.",
            "A specific, polite request improves response rates.",
        ),
        (
            r"\bjust\s+checking\s+in\b",
            "unclear_request",
            "Clarify what you need from the recipient.",
            "I am following up regarding [topic] and would appreciate an update.",
            "Vague check-ins are harder to act on — state the purpose clearly.",
        ),
    ]

    for pattern, issue_type, message, suggestion, why in patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            issues.append(
                _issue(
                    text,
                    m.start(),
                    m.end(),
                    issue_type=issue_type,
                    message=message,
                    suggestion=suggestion,
                    why=why,
                )
            )

    has_greeting = bool(
        re.search(r"^(dear|hello|hi|good\s+(morning|afternoon|evening))\b", lower)
    )
    if len(text.split()) > 8 and not has_greeting:
        issues.append(
            _issue(
                text,
                0,
                0,
                issue_type="missing_greeting",
                message="Add a professional greeting.",
                suggestion="Hello,",
                why="Professional emails typically open with a courteous greeting.",
            )
        )

    has_closing = bool(
        re.search(r"\b(regards|sincerely|thank you|best|respectfully|yours)\b", lower)
    )
    if len(text.split()) > 12 and not has_closing:
        issues.append(
            _issue(
                text,
                0,
                0,
                issue_type="missing_closing",
                message="Add a courteous closing.",
                suggestion="Best regards,",
                why="A polite closing signals professionalism and respect.",
            )
        )

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
    for i, sentence in enumerate(sentences):
        if len(sentence.split()) > 28:
            idx = text.find(sentence[: min(40, len(sentence))])
            if idx < 0:
                idx = 0
            issues.append(
                _issue(
                    text,
                    idx,
                    idx + len(sentence),
                    issue_type="long_sentence",
                    message="This sentence is long for email — consider splitting it.",
                    suggestion=sentence[: len(sentence) // 2] + ". " + sentence[len(sentence) // 2 :],
                    why="Shorter sentences improve readability in professional email.",
                )
            )

    seen: set[tuple[int, str]] = set()
    unique: list[GrammarIssue] = []
    for item in issues:
        key = (item.offset, item.issue_type)
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique[:6]


def _professionalism_score(issues: list[GrammarIssue]) -> int:
    penalty = 0
    for i in issues:
        if i.issue_type in ("blunt_wording", "casual_wording", "tone_issue"):
            penalty += 14
        elif i.issue_type in ("missing_greeting", "missing_closing"):
            penalty += 10
        elif i.issue_type in ("weak_cta", "unclear_request"):
            penalty += 8
        else:
            penalty += 6
    return max(42, min(99, 100 - penalty))


async def check_email(text: str, user_dictionary: list[str] | None = None) -> GrammarCheckResult:
    del user_dictionary
    if not text.strip():
        return GrammarCheckResult(
            issues=[],
            grammar_score=100,
            issue_count=0,
            clarity_score=100,
            clarity_suggestions=[],
        )

    issues = _detect_email_issues(text)
    clarity_score, clarity_suggestions = _clarity_score_and_suggestions(text)
    prof = _professionalism_score(issues)

    return GrammarCheckResult(
        issues=issues,
        grammar_score=prof,
        issue_count=len(issues),
        clarity_score=clarity_score,
        clarity_suggestions=clarity_suggestions,
    )


def email_scores_from_result(result: GrammarCheckResult) -> dict:
    return {
        "writing_mode": "email",
        "tone": "Professional Email",
        "professionalism_score": result.grammar_score,
        "clarity_score": result.clarity_score,
        "issue_count": result.issue_count,
    }
