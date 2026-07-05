"""Canonical disability names and alias normalization."""
from __future__ import annotations

from typing import Dict

ALIASES: Dict[str, str] = {
    "ADHD": "Attention Deficit Hyperactivity Disorder",
    "APD": "Auditory Processing Disorder",
    "NVLD": "Non verbal Learning Disorder",
    "LPD": "Language Processing Disorder",
    "No Disability": "No disability",
    "none": "No disability",
}

CANONICAL_NAMES = frozenset(
    {
        "No disability",
        "Dyslexia",
        "Dysgraphia",
        "Dyscalculia",
        "Attention Deficit Hyperactivity Disorder",
        "Auditory Processing Disorder",
        "Non verbal Learning Disorder",
        "Language Processing Disorder",
    }
)


def normalize_disability(name: str) -> str:
    """Return canonical disability name for prompts and validation."""
    if not name:
        return "Dyslexia"
    stripped = name.strip()
    if stripped in ALIASES:
        return ALIASES[stripped]
    if stripped in CANONICAL_NAMES:
        return stripped
    # Case-insensitive alias lookup
    lower = stripped.lower()
    for alias, canonical in ALIASES.items():
        if alias.lower() == lower:
            return canonical
    for canonical in CANONICAL_NAMES:
        if canonical.lower() == lower:
            return canonical
    return stripped


__all__ = ["ALIASES", "CANONICAL_NAMES", "normalize_disability"]
