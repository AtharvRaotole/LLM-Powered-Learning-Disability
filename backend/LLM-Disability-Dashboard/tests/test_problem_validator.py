import pytest

from app.services.problem_validator import (
    answers_match,
    extract_answer_from_solution,
    validate_problem_consistency,
)


def test_extract_answer_from_final_answer_line():
    solution = (
        "1. Add 2 and 2 to get 4.\n"
        "2. Multiply by 1.\n"
        "Final answer: 4"
    )
    assert extract_answer_from_solution(solution) == 4.0


def test_extract_answer_from_last_step_number():
    solution = "1. Split 10 into 5 and 5.\n2. Add them: 5 + 5 = 10"
    assert extract_answer_from_solution(solution) == 10.0


def test_validate_matching_problem():
    problem = {
        "problem": "What is 2 + 2?",
        "answer": "4",
        "solution": "1. Add 2 and 2.\nFinal answer: 4",
    }
    result = validate_problem_consistency(problem)
    assert result["valid"] is True


def test_validate_mismatched_problem():
    problem = {
        "problem": "What is 2 + 2?",
        "answer": "4",
        "solution": "1. Add incorrectly.\nFinal answer: 3",
    }
    result = validate_problem_consistency(problem)
    assert result["valid"] is False


def test_answers_match_integers():
    assert answers_match(4.0, 4.0) is True
    assert answers_match(4.0, 3.0) is False


def test_validate_fraction_answer():
    problem = {
        "answer": "0.5",
        "solution": "1. Half of 1 is 1/2.\nAnswer is 1/2",
    }
    result = validate_problem_consistency(problem)
    assert result["valid"] is True
