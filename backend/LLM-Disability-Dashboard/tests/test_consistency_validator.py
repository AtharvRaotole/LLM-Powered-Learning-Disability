from app.services.consistency_validator import check_step_answer_consistency


def test_step_answer_consistency_match():
    attempt = {
        "final_answer": "12",
        "steps_to_solve": ["Step 1: 6 x 2", "Step 2: Final answer is 12"],
    }
    result = check_step_answer_consistency(attempt, "12")
    assert result["score"] == 1.0


def test_step_answer_consistency_mismatch():
    attempt = {
        "final_answer": "12",
        "steps_to_solve": ["Step 1: 6 x 2", "Step 2: I think it is 10"],
    }
    result = check_step_answer_consistency(attempt, "12")
    assert result["score"] < 1.0
