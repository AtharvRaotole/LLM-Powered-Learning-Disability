"""LangGraph workflow service that orchestrates educational assistance tasks."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException

from .langgraph_state import LearningSessionState
from .orchestrator import LangGraphOrchestrator

orchestrator = LangGraphOrchestrator()


def _derive_current_step(state: LearningSessionState) -> str:
    """Determine the furthest completed step for UI progress feedback."""

    if state.get("disability_analysis"):
        return "completed"
    if state.get("adaptive_plan"):
        return "completed"
    if state.get("consistency_report"):
        return "consistency_validated"
    if state.get("tutor_session"):
        return "tutor_simulated"
    if state.get("strategies"):
        return "strategies_generated"
    if state.get("thought_analysis"):
        return "thought_analyzed"
    if state.get("student_attempt"):
        return "student_simulated"
    if state.get("problem"):
        return "problem_generated"
    return "initialized"


async def run_learning_session(initial_state: Dict[str, Any]) -> Dict[str, Any]:
    """Backward-compatible helper used by the legacy `/session` endpoint."""

    state = orchestrator.build_initial_state(initial_state)
    final_state = await orchestrator.run_graph(state)
    return orchestrator.sanitize_state(final_state)


async def run_full_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the complete LangGraph workflow."""

    payload = {**payload, "workflow_type": "full"}
    return await _run_graph_workflow(payload)


async def run_problem_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Generate only the math problem for preview/use in other workflows."""

    state = orchestrator.build_initial_state(payload)
    metadata = state.get("metadata") or {}
    use_cache = not metadata.get("refresh_problem", False)
    problem = await orchestrator.generate_problem(
        state.get("grade_level", "7th"),
        state.get("difficulty", "medium"),
        use_cache=use_cache,
    )
    state["problem"] = problem
    sanitized = orchestrator.sanitize_state(state)
    return orchestrator.format_workflow_results(
        sanitized,
        workflow_type="problem_only",
        current_step="problem_generated",
    )


async def run_analysis_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Run only the analysis portion (requires existing problem + attempt)."""

    if not payload.get("problem"):
        raise HTTPException(status_code=400, detail="problem is required for analysis workflow")
    if not payload.get("student_attempt"):
        raise HTTPException(status_code=400, detail="student_attempt is required for analysis workflow")

    payload = {**payload, "workflow_type": "analysis_only"}
    return await _run_graph_workflow(payload)


async def run_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point that dispatches to the appropriate workflow variant."""

    workflow_type = str(payload.get("workflow_type", "full")).lower()
    if workflow_type == "problem_only":
        return await run_problem_workflow(payload)
    if workflow_type == "analysis_only":
        return await run_analysis_workflow(payload)
    return await run_full_workflow(payload)


async def _run_graph_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    state = orchestrator.build_initial_state(payload)
    final_state = await orchestrator.run_graph(state)
    sanitized = orchestrator.sanitize_state(final_state)
    workflow_type = state.get("metadata", {}).get("workflow_type", "full")
    if workflow_type == "problem_only":
        current_step = _derive_current_step(sanitized)
    else:
        current_step = "completed" if sanitized else "initialized"
    return orchestrator.format_workflow_results(
        sanitized,
        workflow_type=workflow_type,
        current_step=current_step,
    )


__all__ = [
    "run_learning_session",
    "run_full_workflow",
    "run_problem_workflow",
    "run_analysis_workflow",
    "run_workflow",
]
