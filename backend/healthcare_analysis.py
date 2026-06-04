"""Healthcare mode — clinical/business writing with domain dictionary."""

from __future__ import annotations

import re

from grammar import (
    GrammarCheckResult,
    GrammarIssue,
    _clarity_score_and_suggestions,
    _filter_false_positives,
    _grammar_score,
    _merge_issues,
    _parse_matches,
    apply_all_corrections,
    _check_via_api,
    _check_local,
)
from config import settings
from healthcare_dictionary import merged_terms

HEALTHCARE_CATEGORIES = {
    "clinical_clarity": "Clinical Clarity",
    "context_error": "Context Error",
    "healthcare_tone": "Healthcare Tone",
    "risk_clarity": "Risk / Action Clarity",
    "long_sentence": "Long Sentence",
}


def _hc_issue(
    text: str,
    start: int,
    end: int,
    *,
    issue_type: str,
    message: str,
    suggestion: str,
    why: str,
) -> GrammarIssue:
    title = HEALTHCARE_CATEGORIES.get(issue_type, "Clinical Clarity")
    return GrammarIssue(
        id=f"hc-{issue_type}-{start}",
        message=message,
        short_message=title,
        issue_title=title,
        problem=text[start:end] if end > start else message[:60],
        suggestion=suggestion,
        why=why,
        offset=start,
        length=max(0, end - start),
        replacements=[suggestion] if suggestion else [],
        rule_id=f"HC_{issue_type.upper()}",
        category="healthcare",
        issue_type=issue_type,
    )


def _healthcare_custom_issues(text: str) -> list[GrammarIssue]:
    custom: list[GrammarIssue] = []

    for m in re.finditer(r"\bAI-peered\s+agent\b", text, re.IGNORECASE):
        phrase = text[m.start() : m.end()]
        custom.append(
            _hc_issue(
                text,
                m.start(),
                m.end(),
                issue_type="context_error",
                message=f'"{phrase}" should be "AI-powered agent."',
                suggestion="AI-powered agent",
                why='"AI-powered" is the correct phrase for clinical technology descriptions.',
            )
        )

    for m in re.finditer(r"\bnot\s+tidied\s+until\b", text, re.IGNORECASE):
        phrase = text[m.start() : m.end()]
        custom.append(
            _hc_issue(
                text,
                m.start(),
                m.end(),
                issue_type="context_error",
                message=f'"{phrase}" may be incorrect. Did you mean "not notified until"?',
                suggestion="not notified until",
                why='"Notified" fits patient outreach; "tidied" does not belong in clinical follow-up context.',
            )
        )

    for m in re.finditer(
        r"\b(patients?|clinical\s+team)\b[^.]{0,80}\bwithout\s+(?:clear|defined)\s+(?:next\s+steps|actions)\b",
        text,
        re.IGNORECASE,
    ):
        custom.append(
            _hc_issue(
                text,
                m.start(),
                m.end(),
                issue_type="risk_clarity",
                message="Clarify follow-up actions for at-risk patients.",
                suggestion="with documented follow-up actions and escalation criteria",
                why="Healthcare operations writing should make risk and next steps explicit.",
            )
        )

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
    for sentence in sentences:
        if len(sentence.split()) > 32:
            idx = text.find(sentence[: min(50, len(sentence))])
            if idx < 0:
                continue
            custom.append(
                _hc_issue(
                    text,
                    idx,
                    idx + len(sentence),
                    issue_type="long_sentence",
                    message="Long clinical sentence — split for care-team readability.",
                    suggestion="Break into two sentences: context, then action or outcome.",
                    why="Long healthcare sentences slow comprehension for busy clinical staff.",
                )
            )

    return custom


def _clinical_clarity_score(issues: list[GrammarIssue], clarity: int) -> int:
    penalty = sum(
        12
        if i.issue_type == "context_error"
        else 8
        if i.issue_type in ("long_sentence", "risk_clarity")
        else 5
        for i in issues
    )
    return max(45, min(99, min(clarity, 100) - penalty // 2))


def _professionalism_healthcare(issues: list[GrammarIssue]) -> int:
    penalty = len(issues) * 7
    return max(50, min(99, 100 - penalty))


async def check_healthcare(
    text: str, user_dictionary: list[str] | None = None
) -> GrammarCheckResult:
    if not text.strip():
        return GrammarCheckResult(
            issues=[],
            grammar_score=100,
            issue_count=0,
            clarity_score=100,
            clarity_suggestions=[],
        )

    terms = merged_terms(user_dictionary)
    use_api = bool(settings.languagetool_api_url) or settings.serve_web
    try:
        matches = await _check_via_api(text) if use_api else _check_local(text)
    except Exception:
        matches = await _check_via_api(text)

    lt_issues = _filter_false_positives(text, _parse_matches(text, matches), list(terms))
    custom = _filter_false_positives(text, _healthcare_custom_issues(text), list(terms))
    issues = _filter_false_positives(
        text, _merge_issues(lt_issues, custom), list(terms)
    )

    clarity_score, clarity_suggestions = _clarity_score_and_suggestions(text)
    clinical = _clinical_clarity_score(issues, clarity_score)
    grammar = _grammar_score(issues, len(text))
    if issues:
        grammar = min(grammar, 99)

    correctable = [i for i in issues if i.issue_type not in ("clinical_clarity",)]
    corrected = apply_all_corrections(text, correctable) if correctable else text

    return GrammarCheckResult(
        issues=issues,
        grammar_score=grammar,
        issue_count=len(issues),
        clarity_score=clinical,
        clarity_suggestions=clarity_suggestions,
        corrected_text=corrected if correctable else None,
    )


def healthcare_scores_from_result(result: GrammarCheckResult) -> dict:
    prof = _professionalism_healthcare(result.issues)
    return {
        "writing_mode": "healthcare",
        "tone": "Professional Healthcare",
        "clinical_clarity_score": result.clarity_score,
        "professionalism_score": prof,
        "grammar_score": result.grammar_score,
        "issue_count": result.issue_count,
    }
