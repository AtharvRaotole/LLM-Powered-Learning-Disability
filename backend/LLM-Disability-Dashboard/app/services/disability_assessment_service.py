"""Guided disability assessment with confidence-gated verdicts."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from .disability_registry import CANONICAL_NAMES, normalize_disability
from .llm_client import LLMClient
from .prompts import get_workflow_prompts

CONFIDENCE_THRESHOLD = 0.80
MAX_ROUNDS = 3
DEFAULT_FOLLOW_UP_MESSAGE = (
    "I need one more question before I can give you a confident answer."
)
LOW_CONFIDENCE_DISCLAIMER = (
    "This assessment reached the maximum number of questions but confidence remains "
    "below our threshold. The result below is our best estimate based on available "
    "evidence. This is a screening tool only, not a clinical diagnosis. Please "
    "consult a qualified professional for formal evaluation."
)
PROFESSIONAL_DISCLAIMER = (
    "This is an AI-powered screening tool, not a clinical diagnosis. "
    "Results should be reviewed by a qualified educational or medical professional "
    "before any decisions are made."
)

_llm_client = LLMClient()
_prompts = get_workflow_prompts()


def _confidence_label(confidence: float) -> str:
    if confidence >= 0.80:
        return "high"
    if confidence >= 0.50:
        return "medium"
    return "low"


def _normalize_recommendations(raw: Any) -> List[str]:
    if isinstance(raw, list):
        return [str(item) for item in raw if item]
    if isinstance(raw, dict):
        items: List[str] = []
        for value in raw.values():
            if isinstance(value, str) and value.strip():
                items.append(value.strip())
            elif isinstance(value, list):
                items.extend(str(v) for v in value if v)
        return items
    if isinstance(raw, str) and raw.strip():
        return [raw.strip()]
    return []


def _normalize_verdict(raw_verdict: Dict[str, Any], confidence: float, forced_low: bool = False) -> Dict[str, Any]:
    primary = normalize_disability(str(raw_verdict.get("primary_disability", "No disability")))
    if primary not in CANONICAL_NAMES:
        primary = "No disability"

    consultation = raw_verdict.get("professional_consultation") or PROFESSIONAL_DISCLAIMER
    if forced_low:
        consultation = LOW_CONFIDENCE_DISCLAIMER

    return {
        "primary_disability": primary,
        "indicators": raw_verdict.get("indicators") or [],
        "error_patterns": raw_verdict.get("error_patterns") or [],
        "strengths_observed": raw_verdict.get("strengths_observed") or [],
        "reasoning": raw_verdict.get("reasoning") or "",
        "recommendations": _normalize_recommendations(raw_verdict.get("recommendations")),
        "professional_consultation": consultation,
        "confidence_label": _confidence_label(confidence),
    }


async def _generate_screening_problem(
    grade_level: str,
    difficulty: str,
    round_number: int,
    prior_rounds: Optional[List[Dict[str, str]]] = None,
    focus_area: Optional[str] = None,
) -> Dict[str, Any]:
    prompt = _prompts.get_disability_screening_problem_prompt(
        grade_level=grade_level,
        difficulty=difficulty,
        round_number=round_number,
        prior_rounds=prior_rounds,
        focus_area=focus_area,
    )
    payload = await _llm_client.invoke_with_prompt(
        prompt=prompt,
        model="gpt-4o-mini",
        temperature=0.3,
        use_cache=False,
    )
    if not isinstance(payload, dict) or not payload.get("problem"):
        raise HTTPException(status_code=500, detail="Screening problem generation failed")
    return payload


async def start_assessment(grade_level: str, difficulty: str) -> Dict[str, Any]:
    """Generate the first diagnostic question."""
    problem_data = await _generate_screening_problem(
        grade_level=grade_level,
        difficulty=difficulty,
        round_number=1,
    )
    return {
        "round_number": 1,
        "question": {
            "problem": problem_data["problem"],
            "focus_area": problem_data.get("focus_area", "general screening"),
            "grade_level": problem_data.get("grade_level", grade_level),
            "difficulty": problem_data.get("difficulty", difficulty),
        },
    }


async def evaluate_assessment(
    grade_level: str,
    difficulty: str,
    rounds: List[Dict[str, str]],
    round_number: int,
) -> Dict[str, Any]:
    """Evaluate answers and return a verdict or follow-up question."""
    if not rounds:
        raise HTTPException(status_code=400, detail="At least one Q&A round is required")
    if round_number < 1 or round_number > MAX_ROUNDS:
        raise HTTPException(status_code=400, detail=f"round_number must be between 1 and {MAX_ROUNDS}")

    for i, r in enumerate(rounds):
        if not r.get("question") or not r.get("answer"):
            raise HTTPException(status_code=400, detail=f"Round {i + 1} must include question and answer")

    prompt = _prompts.get_disability_assessment_evaluation_prompt(
        rounds=rounds,
        grade_level=grade_level,
        difficulty=difficulty,
        round_number=round_number,
    )
    evaluation = await _llm_client.invoke_with_prompt(
        prompt=prompt,
        model="gpt-4o-mini",
        temperature=0.2,
        use_cache=False,
    )
    if not isinstance(evaluation, dict):
        raise HTTPException(status_code=500, detail="Assessment evaluation returned invalid payload")

    status = str(evaluation.get("status", "needs_follow_up")).lower()
    confidence = float(evaluation.get("confidence", 0.0))
    message = evaluation.get("message") or DEFAULT_FOLLOW_UP_MESSAGE
    focus_area = evaluation.get("next_question_focus")
    raw_verdict = evaluation.get("verdict") or {}

    at_max_rounds = round_number >= MAX_ROUNDS

    # Force follow-up if LLM claims verdict but confidence is too low (unless max rounds)
    if status == "verdict" and confidence < CONFIDENCE_THRESHOLD and not at_max_rounds:
        status = "needs_follow_up"
        if not focus_area:
            focus_area = raw_verdict.get("primary_disability") or "ambiguous patterns"

    if status == "needs_follow_up" and not at_max_rounds:
        next_round = round_number + 1
        problem_data = await _generate_screening_problem(
            grade_level=grade_level,
            difficulty=difficulty,
            round_number=next_round,
            prior_rounds=rounds,
            focus_area=focus_area,
        )
        return {
            "status": "needs_follow_up",
            "confidence": confidence,
            "confidence_label": _confidence_label(confidence),
            "message": message if confidence < CONFIDENCE_THRESHOLD else DEFAULT_FOLLOW_UP_MESSAGE,
            "next_question": {
                "problem": problem_data["problem"],
                "focus_area": problem_data.get("focus_area", focus_area),
            },
            "round_number": next_round,
        }

    # Issue verdict (either confident or forced at max rounds)
    forced_low = confidence < CONFIDENCE_THRESHOLD
    if not raw_verdict and forced_low:
        raw_verdict = {
            "primary_disability": "No disability",
            "indicators": [],
            "error_patterns": [],
            "strengths_observed": [],
            "reasoning": "Insufficient evidence across all rounds to identify a specific learning disability.",
            "recommendations": ["Consider a formal evaluation if concerns persist."],
        }

    verdict = _normalize_verdict(raw_verdict, confidence, forced_low=forced_low and at_max_rounds)

    return {
        "status": "verdict",
        "confidence": confidence,
        "confidence_label": verdict["confidence_label"],
        "verdict": verdict,
    }


__all__ = [
    "start_assessment",
    "evaluate_assessment",
    "CONFIDENCE_THRESHOLD",
    "MAX_ROUNDS",
]
