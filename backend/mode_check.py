"""Route writing checks by mode — general, email, resume, healthcare."""

from __future__ import annotations

from academic_analysis import check_academic, academic_scores_from_result
from business_analysis import check_business, business_scores_from_result
from email_analysis import check_email, email_scores_from_result
from grammar import check_grammar as check_general_grammar
from healthcare_analysis import check_healthcare, healthcare_scores_from_result
from resume_analysis import check_resume, resume_scores_from_result


async def check_by_mode(
    text: str,
    mode: str = "general",
    user_dictionary: list[str] | None = None,
) -> dict:
    mode = (mode or "general").lower()

    if mode == "resume":
        result = await check_resume(text, user_dictionary)
        payload = result.model_dump()
        payload.update(resume_scores_from_result(result, text))
        return payload

    if mode == "email":
        result = await check_email(text, user_dictionary)
        payload = result.model_dump()
        payload.update(email_scores_from_result(result))
        return payload

    if mode == "healthcare":
        result = await check_healthcare(text, user_dictionary)
        payload = result.model_dump()
        payload.update(healthcare_scores_from_result(result))
        return payload

    if mode == "academic":
        result = await check_academic(text, user_dictionary)
        payload = result.model_dump()
        payload.update(academic_scores_from_result(result))
        return payload

    if mode == "business":
        result = await check_business(text, user_dictionary)
        payload = result.model_dump()
        payload.update(business_scores_from_result(result))
        return payload

    result = await check_general_grammar(text, user_dictionary, mode="general")
    payload = result.model_dump()
    payload["writing_mode"] = "general"
    payload["tone"] = "Neutral"
    return payload
