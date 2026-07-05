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
