from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_evaluation_orchestrator_imports_chat_prompt_template():
    from langchain_core.prompts import ChatPromptTemplate

    from app.services import evaluation_orchestrator

    assert evaluation_orchestrator.ChatPromptTemplate is ChatPromptTemplate


@patch("app.services.evaluation_orchestrator.improvement_graph")
def test_improvement_analysis_endpoint_accepts_payload(mock_improvement_graph):
    mock_graph = AsyncMock()
    mock_graph.ainvoke.return_value = {
        "student_summary": "Student struggles with carrying.",
        "generated_problem": '{"problem": "12 + 9 = ?"}',
        "student_attempt": '{"thoughtprocess": "I add ones first.", "steps_to_solve": ["Add 2+9"], "final_answer": "21", "studentAnswer": "21"}',
        "improvement_analysis": "The student improved place-value reasoning.",
        "practice_problems": ["1. 15 + 8", "2. 23 + 6", "3. 11 + 14"],
    }
    mock_improvement_graph.return_value = mock_graph

    response = client.post(
        "/api/v2/langgraph/improvement_analysis",
        json={
            "past_attempts": '{"student_simulation": {"final_answer": "19"}}',
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["summary"] == "Student struggles with carrying."
    assert body["improvement_analysis"] == "The student improved place-value reasoning."
    assert body["practice_problems"] == ["1. 15 + 8", "2. 23 + 6", "3. 11 + 14"]

    mock_graph.ainvoke.assert_awaited_once_with(
        {"past_attempts": '{"student_simulation": {"final_answer": "19"}}'}
    )
