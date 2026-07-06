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
