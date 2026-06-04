"""Business writing mode — confidence, conciseness, professionalism."""

from __future__ import annotations

import re

from grammar import GrammarCheckResult, GrammarIssue, _clarity_score_and_suggestions


def _issue(text: str, start: int, end: int, issue_type: str, title: str, message: str, suggestion: str, why: str) -> GrammarIssue:
    return GrammarIssue(
        id=f"biz-{issue_type}-{start}",
        message=message,
        short_message=title,
        issue_title=title,
        problem=text[start:end] if end > start else message[:60],
        suggestion=suggestion,
        why=why,
        offset=start,
        length=max(0, end - start),
        replacements=[suggestion],
        rule_id=f"BUSINESS_{issue_type.upper()}",
        category="business",
        issue_type=issue_type,
    )


def _detect_business_issues(text: str) -> list[GrammarIssue]:
    issues: list[GrammarIssue] = []
    patterns = [
        (r"\bpretty good\b", "highly effective", "weak confidence", "Use confident, specific language in business writing."),
        (r"\bcould maybe\b", "can", "hedging", "Remove hedging to sound more decisive."),
        (r"\byou guys\b", "your team", "informal", "Use professional address in client communication."),
        (r"\bjust wanted to reach out\b", "I am reaching out to discuss", "weak opening", "Lead with purpose and confidence."),
        (r"\bsometime soon\b", "at your earliest convenience", "vague timing", "Offer a clear timeframe or next step."),
        (r"\bwe think\b", "Our analysis indicates", "uncertain", "Support claims with evidence-oriented language."),
        (r"\bmaybe help\b", "help", "hedging", "State value proposition confidently."),
    ]
    for pattern, suggestion, itype, why in patterns:
        for m in re.finditer(pattern, text, re.I):
            issues.append(
                _issue(
                    text,
                    m.start(),
                    m.end(),
                    itype.replace(" ", "_"),
                    "Professionalism" if "informal" not in itype else "Tone",
                    "Improve business tone and confidence.",
                    suggestion,
                    why,
                )
            )
    return issues[:8]


async def check_business(text: str, user_dictionary: list[str] | None = None) -> GrammarCheckResult:
    del user_dictionary
    if not text.strip():
        return GrammarCheckResult(issues=[], grammar_score=100, issue_count=0, clarity_score=100, clarity_suggestions=[])

    issues = _detect_business_issues(text)
    clarity_score, clarity_suggestions = _clarity_score_and_suggestions(text)
    prof = max(42, min(99, 100 - len(issues) * 10))
    return GrammarCheckResult(
        issues=issues,
        grammar_score=prof,
        issue_count=len(issues),
        clarity_score=clarity_score,
        clarity_suggestions=clarity_suggestions,
    )


def business_scores_from_result(result: GrammarCheckResult) -> dict:
    return {
        "writing_mode": "business",
        "tone": "Business Professional",
        "professionalism_score": result.grammar_score,
        "clarity_score": result.clarity_score,
        "issue_count": result.issue_count,
    }
