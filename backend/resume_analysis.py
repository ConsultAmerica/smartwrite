"""Resume-mode quality checks — weak bullets, vague wording, impact, and ATS."""

from __future__ import annotations

import re

from grammar import ClaritySuggestion, GrammarCheckResult, GrammarIssue

# issue_type values map to UI category labels via issue_title
RESUME_CATEGORIES = {
    "weak_verb": "Weak Verb",
    "vague_wording": "Vague Wording",
    "missing_impact": "Missing Impact",
    "missing_metrics": "Missing Metrics",
    "ats_keyword": "ATS Keyword Opportunity",
    "resume_style": "Resume Style",
}


def _issue(
    *,
    id_suffix: str,
    start: int,
    end: int,
    text: str,
    message: str,
    problem: str,
    suggestion: str,
    why: str,
    issue_type: str,
    replacements: list[str] | None = None,
) -> GrammarIssue:
    phrase = text[start:end] if end > start else problem
    title = RESUME_CATEGORIES.get(issue_type, "Resume Style")
    reps = replacements if replacements is not None else ([suggestion] if suggestion else [])
    return GrammarIssue(
        id=f"resume-{issue_type}-{id_suffix}-{start}",
        message=message,
        short_message=title,
        issue_title=title,
        problem=phrase or problem,
        suggestion=suggestion,
        why=why,
        offset=start,
        length=max(0, end - start),
        replacements=reps,
        rule_id=f"RESUME_{issue_type.upper()}",
        category="resume",
        issue_type=issue_type,
    )


def _has_metrics(text: str) -> bool:
    if re.search(r"\d+\s*%|\$\d+|\d+\+|\d{2,}", text):
        return True
    if re.search(
        r"\b(\d+\s*(users|customers|clients|projects|features|bugs|releases|weeks|months|years))\b",
        text,
        re.I,
    ):
        return True
    return False


def _has_impact_language(text: str) -> bool:
    return bool(
        re.search(
            r"\b(improved|increased|reduced|delivered|achieved|grew|saved|accelerated|"
            r"optimized|streamlined|boosted|enhanced|outcomes?|results?|roi|revenue)\b",
            text,
            re.I,
        )
    )


def _detect_resume_issues(text: str) -> list[GrammarIssue]:
    issues: list[GrammarIssue] = []
    lower = text.lower()

    patterns: list[tuple[str, str, str, str, str, list[str]]] = [
        (
            r"\bhelped\s+(?:the\s+)?team\s+with\s+tasks\b",
            "vague_wording",
            "Replace vague task language with specific contributions.",
            "Collaborated with cross-functional team members to deliver sprint goals and unblock dependencies",
            "Recruiters want concrete work — not generic “helped with tasks.”",
        ),
        (
            r"\bused\s+[\w.#+]+\s+sometimes\b",
            "vague_wording",
            "Remove hedging (“sometimes”) and state how you used the tool.",
            "Built and maintained production features using React, TypeScript, and component-driven UI patterns",
            "Hedging weakens credibility. State consistent, professional usage.",
        ),
        (
            r"\bresponsible\s+for\b",
            "weak_verb",
            "Lead with a strong action verb instead of “Responsible for.”",
            "Resolved UI defects and participated in agile ceremonies to align delivery priorities",
            "“Responsible for” is passive. Start bullets with verbs like Developed, Led, or Delivered.",
        ),
        (
            r"\b(?:developed|built|created)\s+(?:a\s+)?website\s+project\b",
            "vague_wording",
            "Specify what you built and the outcome.",
            "Developed and maintained a responsive React web application with reusable components",
            "“Website project” is too vague — name the stack, scope, and result.",
        ),
        (
            r"\bworked\s+on\b",
            "weak_verb",
            "Use a stronger action verb than “Worked on.”",
            "Developed",
            "Resume bullets should start with strong action verbs (Developed, Led, Built).",
        ),
        (
            r"\battending\s+meetings\b",
            "resume_style",
            "Meetings alone are not an achievement — tie them to delivery outcomes.",
            "collaborated during sprint planning and retrospectives to improve release quality",
            "Listing meetings without impact reads as filler on a resume.",
        ),
        (
            r"\bfixing\s+bugs\b",
            "missing_impact",
            "Show impact of quality work, not only the activity.",
            "resolved UI and integration defects, improving release stability and user experience",
            "Bug fixing is valid — pair it with scope, tools, or measurable quality gains.",
        ),
    ]

    for pattern, issue_type, message, suggestion, why in patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            issues.append(
                _issue(
                    id_suffix=m.group(0)[:12],
                    start=m.start(),
                    end=m.end(),
                    text=text,
                    message=message,
                    problem=text[m.start() : m.end()],
                    suggestion=suggestion,
                    why=why,
                    issue_type=issue_type,
                )
            )

    if re.search(r"\breact\b", lower) and not re.search(
        r"\b(?:typescript|javascript|node\.?js|frontend|component|redux|next\.?js)\b",
        lower,
    ):
        issues.append(
            _issue(
                id_suffix="ats-react",
                start=0,
                end=0,
                text=text,
                message="Add ATS-friendly tech keywords alongside React.",
                problem="React mentioned without related stack keywords",
                suggestion="React, TypeScript, JavaScript, HTML/CSS, responsive UI, component architecture",
                why="Applicant tracking systems scan for skill clusters — list related tools you actually used.",
                issue_type="ats_keyword",
                replacements=[
                    "React, TypeScript, and modern frontend tooling",
                    "React, JavaScript, HTML/CSS, and reusable components",
                ],
            )
        )

    if not _has_metrics(text) and len(text.strip()) > 40:
        issues.append(
            _issue(
                id_suffix="metrics",
                start=0,
                end=0,
                text=text,
                message="Add measurable impact where truthful (%, counts, time saved).",
                problem="No quantified results detected",
                suggestion="Add metrics (e.g., reduced load time by 25%, shipped 8 features, supported 500+ users)",
                why="Strong resume bullets include numbers — even modest estimates beat no metrics.",
                issue_type="missing_metrics",
            )
        )

    if not _has_impact_language(text) and len(text.strip()) > 30:
        issues.append(
            _issue(
                id_suffix="impact",
                start=0,
                end=0,
                text=text,
                message="Highlight outcomes and results, not only duties.",
                problem="Limited outcome-oriented language",
                suggestion="…improved user experience, accelerated delivery, or increased reliability",
                why="Hiring managers scan for results. Pair activities with business or user impact.",
                issue_type="missing_impact",
            )
        )

    # Deduplicate by (offset, issue_type)
    seen: set[tuple[int, str]] = set()
    unique: list[GrammarIssue] = []
    for i in issues:
        key = (i.offset, i.issue_type)
        if key in seen:
            continue
        seen.add(key)
        unique.append(i)
    return unique


def _resume_strength_score(issues: list[GrammarIssue]) -> int:
    penalty = 0
    for i in issues:
        if i.issue_type == "weak_verb":
            penalty += 11
        elif i.issue_type == "vague_wording":
            penalty += 10
        elif i.issue_type == "resume_style":
            penalty += 10
        elif i.issue_type == "ats_keyword":
            penalty += 6
        else:
            penalty += 8
    score = 100 - penalty
    return max(38, min(99, score))


def _impact_score(issues: list[GrammarIssue], text: str) -> int:
    penalty = 0
    for i in issues:
        if i.issue_type == "missing_metrics":
            penalty += 28
        elif i.issue_type == "missing_impact":
            penalty += 22
        elif i.issue_type in ("vague_wording", "weak_verb"):
            penalty += 8
        else:
            penalty += 5
    if not _has_metrics(text):
        penalty += 10
    if not _has_impact_language(text):
        penalty += 12
    score = 100 - penalty
    return max(35, min(99, score))


def _clarity_score_resume(text: str) -> int:
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    if not sentences:
        return 100
    avg = sum(len(s.split()) for s in sentences) / len(sentences)
    if avg > 28:
        return 78
    if avg > 22:
        return 88
    return 96


async def check_resume(text: str, user_dictionary: list[str] | None = None) -> GrammarCheckResult:
    """Resume-mode analysis: quality issues and resume-specific scores."""
    del user_dictionary  # reserved for future dictionary filtering

    if not text.strip():
        return GrammarCheckResult(
            issues=[],
            grammar_score=100,
            issue_count=0,
            clarity_score=100,
            clarity_suggestions=[],
        )

    issues = _detect_resume_issues(text)
    priority = {
        "vague_wording": 0,
        "weak_verb": 1,
        "missing_impact": 2,
        "resume_style": 3,
        "ats_keyword": 4,
        "missing_metrics": 5,
    }
    issues.sort(key=lambda i: (priority.get(i.issue_type, 9), i.offset))
    phrase_level = [i for i in issues if i.length > 0]
    doc_level = [i for i in issues if i.length == 0]
    issues = phrase_level[:4]
    if len(issues) < 4 and doc_level:
        issues.extend(doc_level[: 4 - len(issues)])

    strength = _resume_strength_score(issues)
    impact = _impact_score(issues, text)
    clarity = _clarity_score_resume(text)

    return GrammarCheckResult(
        issues=issues,
        grammar_score=strength,
        issue_count=len(issues),
        clarity_score=clarity,
        clarity_suggestions=[],
    )


def resume_scores_from_result(result: GrammarCheckResult, text: str) -> dict:
    """Extra fields for API consumers (mapped on frontend from grammar_score + headers)."""
    impact = _impact_score(result.issues, text)
    return {
        "resume_strength_score": result.grammar_score,
        "impact_score": impact,
        "clarity_score": result.clarity_score,
        "issue_count": result.issue_count,
        "tone": "Resume-oriented",
    }
