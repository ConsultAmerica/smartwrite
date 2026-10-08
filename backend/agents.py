"""Production-ready AI writing agents with JSON output and rule-based fallbacks."""

from __future__ import annotations

import json
import re
from typing import Any

from ai_rewrite import _client, _model, _source

AGENT_PROMPTS: dict[str, str] = {
    "clarity": """You are the Clarity Agent. Your job is to rewrite text to be clearer, simpler, and easier to read while preserving meaning.

Rules:
- Use short sentences.
- Remove filler words.
- Replace jargon with plain language.
- Keep the tone neutral unless specified.
- Do NOT add new ideas.

Return JSON only:
{
  "rewrite": "...",
  "explanation": ["...", "..."]
}""",
    "tone": """You are the Tone Agent. Rewrite the text using the target tone: {{tone}}.

Tone options include:
- Formal
- Friendly
- Professional
- Assertive
- Empathetic

Rules:
- Keep meaning unchanged.
- Adjust vocabulary, sentence structure, and phrasing.
- Avoid exaggeration.

Return JSON only:
{
  "rewrite": "...",
  "tone": "{{tone}}",
  "notes": ["...", "..."]
}""",
    "grader": """You are the Grader Agent. Evaluate the text using a 0–100 score.

Criteria:
- Clarity (0–25)
- Structure (0–25)
- Grammar (0–25)
- Style & Tone (0–25)

Return JSON only:
{
  "score": 0-100,
  "rubric": {
    "clarity": "...",
    "structure": "...",
    "grammar": "...",
    "style": "..."
  },
  "suggestions": ["...", "..."]
}""",
    "humanizer": """You are the Humanizer Agent. Rewrite the text to sound natural, conversational, and human.

Rules:
- Add natural rhythm.
- Use contractions where appropriate.
- Vary sentence length.
- Avoid robotic or overly formal phrasing.
- Keep meaning unchanged.

Return JSON only:
{
  "rewrite": "...",
  "changes": ["...", "..."]
}""",
}

FILLER = re.compile(
    r"\b(very|really|just|actually|basically|literally|in order to|due to the fact that)\b",
    re.I,
)


def _extract_json(raw: str) -> dict[str, Any] | None:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            try:
                data = json.loads(match.group())
                return data if isinstance(data, dict) else None
            except json.JSONDecodeError:
                return None
    return None


def _fallback_clarity(text: str) -> dict[str, Any]:
    t = text.strip()
    rewrite = FILLER.sub("", t)
    rewrite = re.sub(r"\s{2,}", " ", rewrite)
    rewrite = re.sub(r",\s*and\s*", " and ", rewrite)
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", rewrite) if s.strip()]
    if len(sentences) > 1 and any(len(s.split()) > 25 for s in sentences):
        rewrite = ". ".join(s.rstrip(".") + "." for s in sentences[:4])
    return {
        "rewrite": rewrite or t,
        "explanation": [
            "Removed filler words where possible.",
            "Shortened long sentences for readability.",
        ],
    }


def _fallback_tone(text: str, tone: str) -> dict[str, Any]:
    t = text.strip()
    tone = tone or "Professional"
    rewrite = t
    if tone.lower() == "formal":
        rewrite = t.replace("can't", "cannot").replace("won't", "will not")
        if not rewrite.lower().startswith(("dear", "hello")):
            rewrite = f"Dear colleague,\n\n{rewrite}\n\nSincerely,"
    elif tone.lower() == "friendly":
        if not rewrite.lower().startswith(("hi", "hey", "hello")):
            rewrite = f"Hi there — {rewrite}"
    elif tone.lower() == "professional":
        rewrite = t.replace("gonna", "going to").replace("wanna", "want to")
    elif tone.lower() == "assertive":
        rewrite = re.sub(r"\b(i think|maybe|perhaps|might)\b", "", rewrite, flags=re.I)
        rewrite = re.sub(r"\s{2,}", " ", rewrite).strip()
    elif tone.lower() == "empathetic":
        rewrite = f"I understand this may be challenging. {t}"
    return {
        "rewrite": rewrite,
        "tone": tone,
        "notes": [f"Adjusted phrasing toward a {tone.lower()} tone.", "Meaning preserved."],
    }


def _fallback_grader(text: str) -> dict[str, Any]:
    words = text.split()
    word_count = len(words)
    sentences = max(1, len(re.split(r"[.!?]+", text)) - 1)
    avg_len = word_count / sentences
    grammar_penalty = len(re.findall(r"\b(she|he|it)\s+go\b", text, re.I)) * 15
    grammar_penalty += len(re.findall(r"\beveryday\b", text, re.I)) * 10
    clarity_penalty = max(0, int((avg_len - 18) * 2))
    structure_penalty = 5 if word_count > 5 and not text.strip()[-1] in ".!?" else 0
    style_penalty = len(FILLER.findall(text)) * 3

    clarity = max(10, 25 - clarity_penalty)
    structure = max(10, 25 - structure_penalty)
    grammar = max(10, 25 - grammar_penalty)
    style = max(10, 25 - style_penalty)
    score = clarity + structure + grammar + style

    suggestions: list[str] = []
    if grammar_penalty:
        suggestions.append("Fix subject-verb agreement and common grammar mistakes.")
    if clarity_penalty:
        suggestions.append("Break up long sentences for clarity.")
    if style_penalty:
        suggestions.append("Replace filler words with precise language.")
    if not suggestions:
        suggestions.append("Writing is solid — refine tone or conciseness for polish.")

    return {
        "score": min(100, score),
        "rubric": {
            "clarity": f"Clarity: {clarity}/25 — {'long sentences detected' if clarity_penalty else 'readable flow'}.",
            "structure": f"Structure: {structure}/25 — {'add closing punctuation' if structure_penalty else 'well structured'}.",
            "grammar": f"Grammar: {grammar}/25 — {'issues found' if grammar_penalty else 'no major errors'}.",
            "style": f"Style: {style}/25 — {'informal fillers present' if style_penalty else 'consistent tone'}.",
        },
        "suggestions": suggestions,
    }


def _fallback_humanizer(text: str) -> dict[str, Any]:
    t = text.strip()
    rewrite = t
    rewrite = rewrite.replace("cannot", "can't").replace("will not", "won't")
    rewrite = rewrite.replace("I am", "I'm").replace("it is", "it's")
    if rewrite and not rewrite[0].islower():
        rewrite = rewrite[0] + rewrite[1:]
    changes = ["Used natural contractions where appropriate.", "Adjusted rhythm for conversational flow."]
    if rewrite == t:
        changes = ["Text already reads naturally — minor rhythm preserved."]
    return {"rewrite": rewrite, "changes": changes}


def _fallback_for(agent: str, text: str, options: dict[str, Any]) -> dict[str, Any]:
    if agent == "clarity":
        return _fallback_clarity(text)
    if agent == "tone":
        return _fallback_tone(text, str(options.get("tone", "Professional")))
    if agent == "grader":
        return _fallback_grader(text)
    if agent == "humanizer":
        return _fallback_humanizer(text)
    return {"rewrite": text, "explanation": ["Unknown agent type."]}


async def _llm_agent(agent: str, text: str, options: dict[str, Any]) -> dict[str, Any]:
    client = _client()
    prompt = AGENT_PROMPTS.get(agent, AGENT_PROMPTS["clarity"])
    if agent == "tone":
        tone = str(options.get("tone", "Professional"))
        prompt = prompt.replace("{{tone}}", tone)

    if client is None:
        return _fallback_for(agent, text, options)

    try:
        response = client.chat.completions.create(
            model=_model(),
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Text to process:\n\n{text}"},
            ],
            temperature=0.35,
            max_tokens=1200,
        )
        raw = (response.choices[0].message.content or "").strip()
        parsed = _extract_json(raw)
        if parsed:
            return parsed
        if agent in ("clarity", "tone", "humanizer"):
            return {"rewrite": raw, "explanation": ["LLM returned plain text; wrapped as rewrite."]}
    except Exception:
        return _fallback_for(agent, text, options)
    return _fallback_for(agent, text, options)


async def run_agent(agent: str, text: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
    agent = agent.lower().strip()
    if agent not in AGENT_PROMPTS:
        raise ValueError(f"Unknown agent: {agent}")
    opts = options or {}
    result = await _llm_agent(agent, text, opts)
    source = _source()
    if source == "fallback":
        result = _fallback_for(agent, text, opts)
    return {"agent": agent, "result": result, "source": source}
