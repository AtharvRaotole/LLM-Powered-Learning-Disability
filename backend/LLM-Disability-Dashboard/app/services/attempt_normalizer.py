"""Normalize and repair student attempt payloads for consistency."""
from __future__ import annotations

import copy
import re
from typing import Any, Dict, Optional

from .consistency_validator import _parse_numeric_like, extract_final_answer


def answers_equal(a: str, b: str) -> bool:
    """Return True when two answers represent the same numeric or textual value."""
    if a is None or b is None:
        return False
    an = _parse_numeric_like(a)
    bn = _parse_numeric_like(b)
    if an is not None and bn is not None:
        tol = max(1e-6, 0.005 * abs(bn))
        return abs(an - bn) <= tol
    return str(a).strip().lower() == str(b).strip().lower()


def normalize_attempt(attempt: Dict[str, Any], expected_answer: str = "") -> Dict[str, Any]:
    """Unify answer fields and ensure steps align with the final answer."""
    data = copy.deepcopy(attempt) if attempt else {}

    final = str(data.get("final_answer") or data.get("studentAnswer") or "").strip()
    if not final:
        final = extract_final_answer(data)

    if final:
        data["final_answer"] = final
        data["studentAnswer"] = final

    steps = data.get("steps_to_solve")
    if not isinstance(steps, list):
        steps = []
    steps = [str(s).strip() for s in steps if str(s).strip()]
    data["steps_to_solve"] = steps

    if final and steps:
        last_step = steps[-1]
        last_num = _parse_numeric_like(last_step)
        final_num = _parse_numeric_like(final)
        found_in_steps = False
        if final_num is not None:
            for step in steps:
                step_num = _parse_numeric_like(step)
                if step_num is not None and abs(step_num - final_num) < 0.01:
                    found_in_steps = True
                    break
        else:
            found_in_steps = final.lower() in last_step.lower()

        if not found_in_steps:
            steps[-1] = f"Final answer: {final}"
            data["steps_to_solve"] = steps

    data.setdefault("is_final_answer_intentionally_incorrect", True)

    if expected_answer and final and answers_equal(final, expected_answer):
        data["_matches_expected"] = True

    return data


def patch_attempt_for_consistency(attempt: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministically inject final answer into the last step when validation fails."""
    data = copy.deepcopy(attempt)
    final = str(data.get("final_answer") or data.get("studentAnswer") or extract_final_answer(data)).strip()
    if not final:
        return data

    data["final_answer"] = final
    data["studentAnswer"] = final
    steps = list(data.get("steps_to_solve") or [])
    if not steps:
        steps = ["Worked through the problem step by step.", f"Final answer: {final}"]
    else:
        steps[-1] = f"Final answer: {final}"
    data["steps_to_solve"] = steps
    data["_consistency_patched"] = True
    return data


def is_correct_answer(attempt: Dict[str, Any], expected_answer: str) -> bool:
    """True when the attempt's final answer matches the expected correct answer."""
    if not expected_answer:
        return False
    final = str(attempt.get("final_answer") or attempt.get("studentAnswer") or "").strip()
    if not final:
        final = extract_final_answer(attempt)
    return bool(final) and answers_equal(final, expected_answer)


__all__ = [
    "answers_equal",
    "normalize_attempt",
    "patch_attempt_for_consistency",
    "is_correct_answer",
]
