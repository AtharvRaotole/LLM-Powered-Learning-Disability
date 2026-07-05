import pytest

from app.services.orchestrator import LangGraphOrchestrator


def test_use_provided_problem_skips_generation_metadata():
    orchestrator = LangGraphOrchestrator()
    payload = {
        "grade_level": "5th",
        "difficulty": "medium",
        "disability": "Dyslexia",
        "problem": {
            "problem": "What is 3 + 3?",
            "answer": "6",
            "solution": "Add 3 and 3 to get 6.",
        },
        "workflow_type": "full",
    }
    state = orchestrator.build_initial_state(payload)
    assert state["metadata"]["use_provided_problem"] is True
    assert state["problem"]["answer"] == "6"


def test_provided_problem_preserved_in_state():
    orchestrator = LangGraphOrchestrator()
    problem = {
        "problem": "Anna has 5 apples.",
        "answer": "5",
        "solution": "Count apples: 5",
    }
    state = orchestrator.build_initial_state(
        {
            "disability": "Dyscalculia",
            "problem": problem,
            "workflow_type": "full",
        }
    )
    assert state["problem"] == problem
