"""Validate that generated problem answer matches the solution steps."""
from __future__ import annotations

import re
from typing import Any, Dict, Optional

from .consistency_validator import _parse_numeric_like

ANSWER_PATTERNS = (
    r"(?:final\s+answer|answer\s+is|equals?|=\s*)([^\n.]+)",
    r"(?:therefore|so),?\s*(?:the\s+)?(?:answer\s+is\s+)?([^\n.]+)",
)


def extract_answer_from_solution(solution: str) -> Optional[float]:
    """Extract the final numeric answer implied by solution text."""
    if not solution or not str(solution).strip():
        return None

    text = str(solution).strip()
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    search_lines = list(reversed(lines)) if lines else [text]

    for line in search_lines:
        lower = line.lower()
        for pattern in ANSWER_PATTERNS:
            match = re.search(pattern, lower, re.IGNORECASE)
            if match:
                num = _parse_numeric_like(match.group(1))
                if num is not None:
                    return num

    for line in search_lines:
        num = _parse_numeric_like(line)
        if num is not None:
            return num

    return _parse_numeric_like(text)


def answers_match(answer_value: float, solution_value: float, *, rel_tol: float = 1e-6) -> bool:
    """Return True when two numeric answers are equivalent within tolerance."""
    if answer_value == solution_value:
        return True
    if answer_value.is_integer() and solution_value.is_integer():
        return int(answer_value) == int(solution_value)
    scale = max(abs(answer_value), abs(solution_value), 1.0)
    return abs(answer_value - solution_value) <= rel_tol * scale


def validate_problem_consistency(problem: Dict[str, Any]) -> Dict[str, Any]:
    """Check that problem['answer'] matches the numeric result in problem['solution']."""
    if not isinstance(problem, dict):
        return {
            "valid": False,
            "answer_field": None,
            "solution_answer": None,
            "details": "Problem payload is not a dictionary",
        }

    answer_raw = problem.get("answer", "")
    solution_raw = problem.get("solution", "")

    answer_num = _parse_numeric_like(answer_raw)
    solution_num = extract_answer_from_solution(str(solution_raw))

    if answer_num is None:
        return {
            "valid": False,
            "answer_field": str(answer_raw),
            "solution_answer": solution_num,
            "details": "Could not parse numeric answer field",
        }

    if solution_num is None:
        return {
            "valid": False,
            "answer_field": answer_num,
            "solution_answer": None,
            "details": "Could not extract numeric answer from solution steps",
        }

    valid = answers_match(answer_num, solution_num)
    details = (
        "Answer matches solution"
        if valid
        else f"Answer field ({answer_num}) does not match solution ({solution_num})"
    )

    return {
        "valid": valid,
        "answer_field": answer_num,
        "solution_answer": solution_num,
        "details": details,
    }
