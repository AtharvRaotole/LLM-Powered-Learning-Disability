from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_langgraph_health():
    response = client.get("/api/v2/langgraph/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_cache_invalidate_endpoint():
    response = client.post(
        "/api/v2/langgraph/cache-invalidate",
        json={"session_id": "test-session"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "workflow_deleted" in body


def test_chat_endpoint_returns_ai_response():
    mock_choice = MagicMock()
    mock_choice.message.content = "• Fractions are parts of a whole.\n• Example: 1/2 means one of two equal pieces."
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch(
        "app.services.openai_service.async_openai_client.chat.completions.create",
        new=AsyncMock(return_value=mock_response),
    ):
        response = client.post(
            "/api/v1/openai/chat",
            json={
                "message": "Can you explain fractions?",
                "chat_mode": "tutor",
                "personality": "helpful",
                "conversation_history": [],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["response"].startswith("• Fractions")
    assert body["personality"] == "helpful"
    assert body["mode"] == "tutor"


def test_adaptive_difficulty_endpoint_with_history():
    response = client.post(
        "/api/v2/langgraph/adaptive-difficulty",
        json={
            "grade_level": "5th",
            "difficulty": "medium",
            "student_history": [
                {"consistency_score": 0.85, "is_correct": True, "difficulty": "medium"},
                {"consistency_score": 0.9, "is_correct": True, "difficulty": "medium"},
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["workflow_type"] == "adaptive_only"
    plan = body["results"]["adaptive_plan"]
    assert plan["recommended_difficulty"] in {"easy", "medium", "hard"}
    assert "reasoning" in plan
    assert "confidence" in plan


def test_adaptive_difficulty_endpoint_empty_history():
    response = client.post(
        "/api/v2/langgraph/adaptive-difficulty",
        json={
            "grade_level": "5th",
            "difficulty": "medium",
            "student_history": [],
        },
    )
    assert response.status_code == 200
    plan = response.json()["results"]["adaptive_plan"]
    assert plan["recommended_difficulty"] == "medium"
    assert plan["current_performance"]["trend"] == "insufficient_data"


def test_disability_assessment_start_endpoint():
    mock_problem = {
        "problem": "What is 12 divided by 3?",
        "focus_area": "division",
        "grade_level": "5th",
        "difficulty": "medium",
    }
    with patch(
        "app.services.disability_assessment_service._generate_screening_problem",
        new=AsyncMock(return_value=mock_problem),
    ):
        response = client.post(
            "/api/v2/langgraph/disability-assessment/start",
            json={"grade_level": "5th", "difficulty": "medium"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["round_number"] == 1
    assert body["question"]["problem"] == mock_problem["problem"]


def test_disability_assessment_evaluate_verdict():
    mock_evaluation = {
        "status": "verdict",
        "confidence": 0.88,
        "verdict": {
            "primary_disability": "Dyscalculia",
            "indicators": ["Difficulty with number sense"],
            "error_patterns": ["Skipped steps"],
            "strengths_observed": ["Strong verbal reasoning"],
            "reasoning": "Patterns suggest dyscalculia.",
            "recommendations": ["Use visual aids"],
            "professional_consultation": "Consult a professional.",
        },
    }
    with patch(
        "app.services.disability_assessment_service._llm_client.invoke_with_prompt",
        new=AsyncMock(return_value=mock_evaluation),
    ):
        response = client.post(
            "/api/v2/langgraph/disability-assessment/evaluate",
            json={
                "grade_level": "5th",
                "difficulty": "medium",
                "round_number": 1,
                "rounds": [
                    {
                        "question": "What is 12 divided by 3?",
                        "answer": "I think it is 5 because 3 times 4 is 12.",
                    }
                ],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "verdict"
    assert body["verdict"]["primary_disability"] == "Dyscalculia"
    assert body["confidence"] == 0.88
