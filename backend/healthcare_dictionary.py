"""Domain terms and user dictionary — suppress false spelling flags from LanguageTool."""

from __future__ import annotations

import re

HEALTHCARE_PHRASES: tuple[str, ...] = (
    "medicare",
    "healthcare",
    "health care",
    "follow-up",
    "follow up",
    "type 2 diabetes",
    "diabetes",
    "hypertension",
    "copd",
    "anemia",
    "readmissions",
    "hospital readmissions",
    "outpatient",
    "chronic disease",
    "lab values",
    "patient records",
    "care coordination",
    "heart failure",
    "medical director",
    "care team",
    "clinical team",
    "high-risk",
    "ehr",
)

_EXTRA_WORDS = (
    "medicare",
    "healthcare",
    "diabetes",
    "hypertension",
    "copd",
    "anemia",
    "outpatient",
    "readmissions",
    "ehr",
)

HEALTHCARE_WORDS: frozenset[str] = frozenset(
    list(_EXTRA_WORDS)
    + [token for phrase in HEALTHCARE_PHRASES for token in re.split(r"[\s\-]+", phrase) if len(token) > 2]
)


def merged_terms(user_dictionary: list[str] | None = None) -> set[str]:
    terms = {p.lower() for p in HEALTHCARE_PHRASES} | {w.lower() for w in HEALTHCARE_WORDS}
    for raw in user_dictionary or []:
        entry = raw.strip().lower()
        if entry:
            terms.add(entry)
    return terms


def _is_spelling_rule(rule_id: str, category: str) -> bool:
    rid = rule_id.upper()
    return "SPELL" in rid or "MORFOLOGIK" in rid or category == "spelling"


def _span_in_phrase(text: str, start: int, end: int, phrase: str) -> bool:
    for match in re.finditer(re.escape(phrase), text, re.IGNORECASE):
        if start < match.end() and end > match.start():
            return True
    return False


def should_suppress_issue(
    text: str,
    offset: int,
    length: int,
    rule_id: str,
    category: str,
    user_terms: set[str],
) -> bool:
    end = offset + max(length, 0)
    span = text[offset:end] if length else ""
    span_lower = span.lower().strip()

    if span_lower and span_lower in user_terms:
        return True

    for term in user_terms:
        if len(term) > len(span_lower) and span_lower and span_lower in term:
            if _span_in_phrase(text, offset, end, term):
                return True

    if not _is_spelling_rule(rule_id, category):
        return False

    if not span_lower:
        return False

    for phrase in HEALTHCARE_PHRASES:
        if span_lower == phrase or span_lower in phrase.split():
            return True
        if _span_in_phrase(text, offset, end, phrase):
            return True

    if span_lower in HEALTHCARE_WORDS:
        return True

    return False
