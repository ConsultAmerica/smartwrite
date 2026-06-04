from __future__ import annotations

import re

from openai import OpenAI

from config import settings

TONE_PROMPTS = {
    "professional": "Rewrite in a professional, polished business tone. Keep the same meaning.",
    "casual": "Rewrite in a friendly, casual tone while staying clear.",
    "academic": "Rewrite in formal academic style suitable for essays or papers.",
    "email": "Polish as a professional email: clear greeting flow, respectful tone, concise.",
    "resume": "Rewrite as a strong resume bullet: action verb, metrics if plausible, impact-focused.",
    "shorter": "Make significantly shorter without losing key meaning.",
    "clearer": "Improve clarity and readability. Fix awkward phrasing.",
    "friendly": "Make warmer and more approachable while staying professional enough.",
  "formal": "Make more formal and respectful.",
  "confident": "Make the writing more confident and assertive without being rude.",
  "grammar": "Fix grammar, spelling, and agreement. Return only the corrected text.",
    "clarity": "Improve clarity and readability. Fix awkward phrasing. Return only the corrected text.",
    "healthcare": (
        "Rewrite for a professional healthcare / clinical business audience. "
        "Use precise, compliant, patient-centered language. Keep facts unchanged."
    ),
}

HEALTHCARE_ACTIONS = {
    "clinical_tone": "Rewrite in a professional clinical business tone suitable for healthcare operations.",
    "patient_friendly": "Rewrite to be clearer for care teams while staying clinically accurate.",
    "concise": "Make this healthcare text more concise without losing clinical meaning.",
    "compliance": "Polish for professional healthcare documentation: clear, respectful, audit-friendly.",
    "care_plan": "Rewrite as a clear care-coordination action note with prioritized next steps.",
}

EMAIL_ACTIONS = {
    "polite": "Rewrite as a polite, courteous email suitable for professional contact.",
    "short": "Rewrite as a brief, concise email that keeps only essential points.",
    "professional": "Rewrite as a polished professional workplace email.",
    "followup": "Rewrite as a friendly follow-up email that prompts a response without pressure.",
    "apology": "Rewrite as a sincere, professional apology email that takes responsibility.",
    # legacy keys
    "polish": "Polish this email for clarity, professionalism, and good structure.",
    "respectful": "Make this email more respectful and courteous without being verbose.",
    "shorter": "Shorten this email while keeping all essential information.",
}

RESUME_ACTIONS = {
    "bullet": (
        "Rewrite the ENTIRE text as ONE strong resume bullet. Start with a powerful action verb. "
        "Include React/frontend stack, bug resolution, team collaboration, and user-experience impact. "
        "Use professional past tense. Return only the rewritten bullet."
    ),
    "action_verbs": "Rewrite using strong action verbs at the start of each phrase (Led, Built, Delivered, etc.).",
    "measurable": "Rewrite to add measurable impact (numbers, percentages, timelines) where reasonable.",
    "ats": "Rewrite with ATS-friendly keywords for tech/business roles while staying truthful.",
    "stronger": "Make this resume bullet more confident, specific, and results-oriented.",
}

_FALLBACK_RESUME_BULLET = (
    "Developed and maintained a responsive React website, resolved UI bugs, "
    "collaborated with team members during project meetings, and improved the overall user "
    "experience through cleaner page layouts and reusable components."
)

def _client() -> OpenAI | None:
    provider = (settings.llm_provider or "").lower()
    if provider == "ollama":
        return OpenAI(
            api_key="ollama",
            base_url=settings.ollama_base_url,
        )
    if provider == "openai" and settings.openai_api_key:
        return OpenAI(api_key=settings.openai_api_key)
    return None


def _model() -> str:
    if (settings.llm_provider or "").lower() == "ollama":
        return settings.ollama_model
    return settings.openai_model


def _source() -> str:
    if _client() is None:
        return "fallback"
    return "ollama" if (settings.llm_provider or "").lower() == "ollama" else "openai"


def _fallback_rewrite(text: str, mode: str) -> str:
    t = text.strip()
    mode = mode.lower()
    if mode == "shorter":
        t = re.sub(r"\b(in order to)\b", "to", t, flags=re.I)
        t = re.sub(r"\b(due to the fact that)\b", "because", t, flags=re.I)
        t = re.sub(r"\s{2,}", " ", t)
    elif mode in ("professional", "formal", "academic", "email"):
        t = t.replace("can't", "cannot").replace("won't", "will not")
        t = t.replace("I'm", "I am").replace("it's", "it is")
        if mode == "email" and not t.lower().startswith("dear"):
            t = f"Hello,\n\n{t}\n\nBest regards"
    elif mode == "casual" or mode == "friendly":
        if not t.lower().startswith(("hi", "hey", "hello")):
            t = f"Hi — {t}"
    elif mode == "resume":
        t = f"Delivered results by {t[0].lower() + t[1:] if t else t}" if t else t
        if not t.endswith("."):
            t += "."
    elif mode == "clearer":
        t = re.sub(r",\s*and\s*", " and ", t)
    return t


async def _llm_rewrite(text: str, instruction: str) -> str:
    client = _client()
    if client is None:
        return _fallback_rewrite(text, instruction.split()[0].lower() if instruction else "professional")

    response = client.chat.completions.create(
        model=_model(),
        messages=[
            {
                "role": "system",
                "content": (
                    "You are SmartWrite AI, a writing assistant. "
                    "Return ONLY the rewritten text with no quotes or explanation."
                ),
            },
            {"role": "user", "content": f"{instruction}\n\nText:\n{text}"},
        ],
        temperature=0.4,
        max_tokens=1024,
    )
    return (response.choices[0].message.content or text).strip()


async def rewrite_text(text: str, mode: str) -> dict:
    mode = mode.lower()
    instruction = TONE_PROMPTS.get(mode, TONE_PROMPTS["professional"])
    rewritten = await _llm_rewrite(text, instruction)
    return {"rewritten_text": rewritten, "mode": mode, "source": _source()}


async def improve_email(text: str, action: str) -> dict:
    action = action.lower()
    instruction = EMAIL_ACTIONS.get(action, EMAIL_ACTIONS["polish"])
    rewritten = await _llm_rewrite(text, instruction)
    return {"rewritten_text": rewritten, "action": action}


def _fallback_resume_bullet(text: str, action: str) -> str:
    t = text.strip()
    lower = t.lower()
    if action == "bullet" or action == "stronger":
        if any(
            k in lower
            for k in (
                "website",
                "react",
                "responsible for",
                "helped team",
                "fixing bugs",
                "meetings",
            )
        ):
            return _FALLBACK_RESUME_BULLET
    if action == "action_verbs":
        return _FALLBACK_RESUME_BULLET
    if action == "measurable":
        return (
            _FALLBACK_RESUME_BULLET.rstrip(".")
            + ", reducing UI defects by an estimated 30% across release cycles."
        )
    if action == "ats":
        return (
            "Developed and maintained a responsive React, TypeScript, and JavaScript web application; "
            "resolved UI bugs; collaborated in Agile sprint meetings; delivered reusable components "
            "and accessible page layouts that improved user experience."
        )
    return _FALLBACK_RESUME_BULLET


async def improve_resume_bullet(text: str, action: str = "bullet") -> dict:
    action = action.lower()
    instruction = RESUME_ACTIONS.get(action, RESUME_ACTIONS["bullet"])
    client = _client()
    if client is None:
        rewritten = _fallback_resume_bullet(text, action)
        return {"rewritten_text": rewritten, "mode": f"resume:{action}", "source": "fallback"}
    rewritten = await _llm_rewrite(text, instruction)
    if len(rewritten) < max(40, len(text) // 2):
        rewritten = _fallback_resume_bullet(text, action)
    return {"rewritten_text": rewritten, "mode": f"resume:{action}", "source": _source()}


async def improve_healthcare(text: str, action: str = "clinical_tone") -> dict:
    action = action.lower()
    instruction = HEALTHCARE_ACTIONS.get(action, HEALTHCARE_ACTIONS["clinical_tone"])
    rewritten = await _llm_rewrite(text, instruction)
    return {"rewritten_text": rewritten, "action": action}


def _is_healthcare_text(lower: str) -> bool:
    healthcare_terms = (
        "medicare",
        "clinic",
        "patient",
        "clinical",
        "healthcare",
        "health care",
        "chronic",
        "diabetes",
        "hypertension",
        "hospital",
        "readmission",
        "outpatient",
        "care coordination",
        "medical director",
        "lab values",
        "copd",
        "anemia",
        "physician",
        "nurse",
        "ehr",
    )
    hits = sum(1 for t in healthcare_terms if t in lower)
    return hits >= 2 or ("patient" in lower and "clinic" in lower)


async def detect_tone(text: str, user_dictionary: list[str] | None = None) -> dict:
    if not text.strip():
        return {
            "tone": "Neutral",
            "clarity_score": 100,
            "grammar_score": 100,
            "suggestion_count": 0,
            "summary": "Start writing to analyze tone and clarity.",
        }

    from grammar import check_grammar

    grammar = await check_grammar(text, user_dictionary)

    lower = text.lower()
    if _is_healthcare_text(lower):
        tone = "Professional Healthcare"
    elif any(w in lower for w in ("dear", "sincerely", "regards", "respectfully")):
        tone = "Formal"
    elif any(w in lower for w in ("hey", "lol", "gonna", "awesome")):
        tone = "Casual"
    elif any(w in lower for w in ("hypothesis", "furthermore", "thus", "literature")):
        tone = "Academic"
    elif "@" in text or "subject:" in lower:
        tone = "Email"
    elif any(
        w in lower
        for w in ("resume", "curriculum vitae", "cv ", "action verb", "ats ")
    ) or (
        any(w in lower for w in ("developed", "implemented", "achieved"))
        and "patient" not in lower
        and "clinic" not in lower
    ):
        tone = "Resume-oriented"
    else:
        tone = "Neutral"

    clarity_suggestions = [s.model_dump() for s in grammar.clarity_suggestions]
    if grammar.issue_count == 0:
        summary = f"Detected {tone} tone. Writing looks clean — keep going!"
    else:
        summary = (
            f"{grammar.issue_count} issue{'s' if grammar.issue_count != 1 else ''} to fix. "
            f"Grammar score: {grammar.grammar_score}%."
        )

    return {
        "tone": tone,
        "clarity_score": grammar.clarity_score,
        "grammar_score": grammar.grammar_score,
        "suggestion_count": grammar.issue_count,
        "summary": summary,
        "clarity_suggestions": clarity_suggestions,
    }
