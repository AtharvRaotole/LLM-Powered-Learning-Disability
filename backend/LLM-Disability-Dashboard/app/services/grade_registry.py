"""Canonical grade levels, difficulty tiers, and prompt guidance."""
from __future__ import annotations

from typing import Dict, List, Tuple

GradeOption = Tuple[str, str]

GRADE_LEVELS: List[GradeOption] = [
    ("childhood", "Early Childhood"),
    ("kindergarten", "Kindergarten"),
    ("1st", "1st Grade"),
    ("2nd", "2nd Grade"),
    ("3rd", "3rd Grade"),
    ("4th", "4th Grade"),
    ("5th", "5th Grade"),
    ("6th", "6th Grade"),
    ("7th", "7th Grade"),
    ("8th", "8th Grade"),
]

DIFFICULTY_LEVELS: List[GradeOption] = [
    ("easy", "Easy"),
    ("medium", "Medium"),
    ("hard", "Hard"),
]

DEFAULT_GRADE_LEVEL = "5th"
DEFAULT_DIFFICULTY = "medium"

GRADE_VALUES = frozenset(value for value, _ in GRADE_LEVELS)
DIFFICULTY_VALUES = frozenset(value for value, _ in DIFFICULTY_LEVELS)

GRADE_LABELS: Dict[str, str] = dict(GRADE_LEVELS)
DIFFICULTY_LABELS: Dict[str, str] = dict(DIFFICULTY_LEVELS)

GRADE_GUIDANCE: Dict[str, str] = {
    "childhood": "Focus on counting, number recognition, simple patterns, comparing sizes, and basic shapes (pre-K / early childhood)",
    "kindergarten": "Focus on counting to 20, simple addition and subtraction within 10, basic shapes, and comparisons",
    "1st": "Focus on addition and subtraction within 20, place value, simple measurement, and telling time",
    "2nd": "Focus on addition and subtraction within 100, basic multiplication concepts, money, and simple shapes",
    "3rd": "Focus on multiplication and division facts, fractions as parts of a whole, area, and multi-step word problems",
    "4th": "Focus on multi-digit multiplication and division, fraction equivalence, decimals, and geometry",
    "5th": "Focus on fractions, decimals, basic geometry, volume, and multi-step problems",
    "6th": "Focus on ratios, rates, integer operations, expressions, and coordinate geometry",
    "7th": "Focus on algebra basics, ratios, percentages, proportional reasoning, and complex word problems",
    "8th": "Focus on linear equations, functions, exponents, roots, and advanced proportional reasoning",
}

DIFFICULTY_GUIDANCE: Dict[str, str] = {
    "easy": "Simple operations, small numbers, 2-3 steps",
    "medium": "Moderate complexity, medium numbers, 3-4 steps",
    "hard": "Complex reasoning, larger numbers, 4-5 steps",
}


def normalize_grade_level(value: str | None) -> str:
    if not value:
        return DEFAULT_GRADE_LEVEL
    stripped = value.strip().lower()
    aliases = {
        "early childhood": "childhood",
        "pre-k": "childhood",
        "prek": "childhood",
        "k": "kindergarten",
        "kg": "kindergarten",
    }
    if stripped in aliases:
        return aliases[stripped]
    for grade_value, _ in GRADE_LEVELS:
        if stripped == grade_value.lower():
            return grade_value
    for grade_value, label in GRADE_LEVELS:
        if stripped == label.lower():
            return grade_value
    return DEFAULT_GRADE_LEVEL


def normalize_difficulty(value: str | None) -> str:
    if not value:
        return DEFAULT_DIFFICULTY
    stripped = value.strip().lower()
    aliases = {
        "beginner": "easy",
        "intermediate": "medium",
        "advanced": "hard",
        "expert": "hard",
        "difficult": "hard",
    }
    if stripped in aliases:
        return aliases[stripped]
    if stripped in DIFFICULTY_VALUES:
        return stripped
    for diff_value, label in DIFFICULTY_LEVELS:
        if stripped == label.lower():
            return diff_value
    return DEFAULT_DIFFICULTY


def validate_grade_level(value: str) -> str:
    normalized = normalize_grade_level(value)
    if normalized not in GRADE_VALUES:
        allowed = ", ".join(GRADE_VALUES)
        raise ValueError(f"Invalid grade_level '{value}'. Allowed: {allowed}")
    return normalized


def validate_difficulty(value: str) -> str:
    normalized = normalize_difficulty(value)
    if normalized not in DIFFICULTY_VALUES:
        allowed = ", ".join(DIFFICULTY_VALUES)
        raise ValueError(f"Invalid difficulty '{value}'. Allowed: {allowed}")
    return normalized


def grade_guidance_block() -> str:
    lines = [f"For {label}: {GRADE_GUIDANCE[value]}" for value, label in GRADE_LEVELS]
    return "\n".join(lines)


def difficulty_guidance_block() -> str:
    return "\n".join(
        f"- {label}: {DIFFICULTY_GUIDANCE[value]}" for value, label in DIFFICULTY_LEVELS
    )


def grade_display_label(value: str) -> str:
    normalized = normalize_grade_level(value)
    return GRADE_LABELS.get(normalized, normalized)


def difficulty_display_label(value: str) -> str:
    normalized = normalize_difficulty(value)
    return DIFFICULTY_LABELS.get(normalized, normalized)
