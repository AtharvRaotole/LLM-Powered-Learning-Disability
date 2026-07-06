"""LangGraph workflow service that orchestrates educational assistance tasks."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from .adaptive_difficulty import adaptive_manager
from .cache_store import get_cache_store
from .disability_registry import normalize_disability
from .grade_registry import DEFAULT_DIFFICULTY, DEFAULT_GRADE_LEVEL, normalize_difficulty, normalize_grade_level
from .langgraph_state import LearningSessionState
from .orchestrator import LangGraphOrchestrator

logger = logging.getLogger(__name__)

orchestrator = LangGraphOrchestrator()
_cache = get_cache_store()

WORKFLOW_PREFIX = "wf:"
BATCH_PREFIX = "wf:batch:"
WORKFLOW_TTL = int(os.getenv("CACHE_WORKFLOW_TTL", "3600"))

_prewarm_status: Dict[str, str] = {}


def _canonical_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def _hash_payload(data: Any) -> str:
    return hashlib.sha256(_canonical_json(data).encode("utf-8")).hexdigest()


def _workflow_cache_key(payload: Dict[str, Any], workflow_type: str) -> str:
    canonical = {
        "workflow_type": workflow_type,
        "grade_level": normalize_grade_level(payload.get("grade_level", DEFAULT_GRADE_LEVEL)),
        "difficulty": normalize_difficulty(payload.get("difficulty", DEFAULT_DIFFICULTY)),
        "disability": normalize_disability(str(payload.get("disability", "Dyslexia"))),
        "problem": payload.get("problem"),
        "student_attempt": payload.get("student_attempt"),
        "student_response": payload.get("student_response"),
        "student_history": payload.get("student_history"),
    }
    return WORKFLOW_PREFIX + _hash_payload(canonical)


def _batch_cache_key(problem: Any, disability: str, grade: str, difficulty: str) -> str:
    canonical = {
        "problem": problem,
        "disability": normalize_disability(disability),
        "grade_level": grade,
        "difficulty": difficulty,
    }
    return BATCH_PREFIX + _hash_payload(canonical)


def _derive_current_step(state: LearningSessionState) -> str:
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


def get_prewarm_status(session_key: str) -> Dict[str, Any]:
    return {"session_key": session_key, "status": _prewarm_status.get(session_key, "unknown")}


async def run_learning_session(initial_state: Dict[str, Any]) -> Dict[str, Any]:
    state = orchestrator.build_initial_state(initial_state)
    final_state = await orchestrator.run_graph(state)
    return orchestrator.sanitize_state(final_state)


async def run_full_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    payload = {**payload, "workflow_type": "full"}
    return await _run_graph_workflow(payload)


async def run_problem_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    state = orchestrator.build_initial_state(payload)
    metadata = state.get("metadata") or {}
    use_cache = not metadata.get("refresh_problem", False)
    problem = await orchestrator.generate_problem(
        normalize_grade_level(state.get("grade_level", DEFAULT_GRADE_LEVEL)),
        normalize_difficulty(state.get("difficulty", DEFAULT_DIFFICULTY)),
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
    if not payload.get("problem"):
        raise HTTPException(status_code=400, detail="problem is required for analysis workflow")
    if not payload.get("student_attempt"):
        raise HTTPException(status_code=400, detail="student_attempt is required for analysis workflow")

    payload = {**payload, "workflow_type": "analysis_only"}
    return await _run_graph_workflow(payload)


def _parse_student_history(raw_history: Any) -> List[Dict[str, Any]]:
    if raw_history is None:
        return []
    if isinstance(raw_history, str):
        try:
            parsed = json.loads(raw_history)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="student_history must be valid JSON") from exc
        if not isinstance(parsed, list):
            raise HTTPException(status_code=400, detail="student_history must be a list")
        return parsed
    if isinstance(raw_history, list):
        return raw_history
    raise HTTPException(status_code=400, detail="student_history must be a list")


async def run_adaptive_difficulty(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Compute an adaptive difficulty plan from stored session history."""
    history = _parse_student_history(payload.get("student_history"))
    current_difficulty = normalize_difficulty(payload.get("difficulty", DEFAULT_DIFFICULTY))
    grade_level = normalize_grade_level(payload.get("grade_level", DEFAULT_GRADE_LEVEL))
    plan = adaptive_manager.calculate_next_difficulty(history, current_difficulty)
    return {
        "status": "ok",
        "workflow_type": "adaptive_only",
        "current_step": "completed",
        "results": {
            "adaptive_plan": plan,
        },
        "metadata": {
            "grade_level": grade_level,
            "difficulty": current_difficulty,
            "session_count": len(history),
        },
    }


async def run_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    workflow_type = str(payload.get("workflow_type", "full")).lower()
    if workflow_type == "problem_only":
        return await run_problem_workflow(payload)
    if workflow_type in {"adaptive_only", "adaptive_difficulty"}:
        return await run_adaptive_difficulty(payload)
    if workflow_type == "analysis_only":
        return await run_analysis_workflow(payload)
    if workflow_type == "pre_tutor":
        return await _run_graph_workflow({**payload, "workflow_type": "pre_tutor"})
    return await run_full_workflow(payload)


async def _run_graph_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    workflow_type = str(payload.get("workflow_type", "full")).lower()
    metadata = dict(payload.get("metadata") or {})
    force_refresh = metadata.get("refresh_problem") or metadata.get("force_refresh")

    cache_key = _workflow_cache_key(payload, workflow_type)
    if not force_refresh:
        cached = await _cache.get(cache_key)
        if cached is not None:
            logger.info("Workflow cache hit: %s", cache_key[:24])
            if isinstance(cached, dict):
                cached_meta = cached.setdefault("metadata", {})
                cached_meta["cache_status"] = {**(cached_meta.get("cache_status") or {}), "workflow": True}
            return cached

    state = orchestrator.build_initial_state(payload)
    final_state = await orchestrator.run_graph(state)
    sanitized = orchestrator.sanitize_state(final_state)

    if workflow_type in {"problem_only", "pre_tutor"}:
        current_step = _derive_current_step(sanitized)
    else:
        current_step = "completed" if sanitized else "initialized"

    result = orchestrator.format_workflow_results(
        sanitized,
        workflow_type=workflow_type,
        current_step=current_step,
    )
    await _cache.set(cache_key, result, WORKFLOW_TTL)
    return result


async def prewarm_workflow(payload: Dict[str, Any]) -> None:
    session_key = str((payload.get("metadata") or {}).get("session_id") or _hash_payload(payload)[:16])
    _prewarm_status[session_key] = "running"
    try:
        await run_full_workflow(payload)
        _prewarm_status[session_key] = "complete"
    except Exception as exc:
        logger.exception("Prewarm failed for %s: %s", session_key, exc)
        _prewarm_status[session_key] = "failed"


def schedule_prewarm(payload: Dict[str, Any]) -> str:
    session_key = str((payload.get("metadata") or {}).get("session_id") or _hash_payload(payload)[:16])
    _prewarm_status[session_key] = "pending"
    asyncio.create_task(prewarm_workflow(payload))
    return session_key


async def run_batch_simulate(payload: Dict[str, Any]) -> Dict[str, Any]:
    problem = payload.get("problem")
    if not problem:
        raise HTTPException(status_code=400, detail="problem is required")

    disabilities: List[str] = payload.get("disabilities") or []
    if not disabilities:
        raise HTTPException(status_code=400, detail="disabilities list is required")

    grade = normalize_grade_level(payload.get("grade_level", DEFAULT_GRADE_LEVEL))
    difficulty = normalize_difficulty(payload.get("difficulty", DEFAULT_DIFFICULTY))

    async def _one(disability: str) -> tuple[str, Dict[str, Any]]:
        canonical = normalize_disability(disability)
        batch_key = _batch_cache_key(problem, canonical, grade, difficulty)
        cached = await _cache.get(batch_key)
        if cached is not None:
            return disability, canonical, cached

        sim_payload = {
            "grade_level": grade,
            "difficulty": difficulty,
            "disability": canonical,
            "problem": problem,
            "workflow_type": "full",
            "metadata": {"simulate_only": True, "stop_after": "consistency"},
        }
        state = orchestrator.build_initial_state(sim_payload)
        state = await orchestrator.run_graph(state)
        entry = {
            "student_simulation": state.get("student_attempt"),
            "consistency_validation": state.get("consistency_report"),
        }
        await _cache.set(batch_key, entry, WORKFLOW_TTL)
        return disability, canonical, entry

    pairs = await asyncio.gather(*[_one(d) for d in disabilities], return_exceptions=True)
    results: Dict[str, Any] = {}
    errors: Dict[str, str] = {}
    for item in pairs:
        if isinstance(item, Exception):
            errors["unknown"] = str(item)
            continue
        original, canonical, data = item
        results[original] = data
        results[canonical] = data

    return {"results": results, "errors": errors}


def _normalize_past_attempts(payload: Dict[str, Any]) -> str:
    past_attempts = payload.get("past_attempts", payload)
    if isinstance(past_attempts, dict):
        return json.dumps(past_attempts)
    if past_attempts is None:
        return ""
    return str(past_attempts)


async def run_improvement_graph(payload: Dict[str, Any]) -> Dict[str, Any]:
    from .evaluation_orchestrator import improvement_graph

    graph = improvement_graph()
    result = await graph.ainvoke({"past_attempts": _normalize_past_attempts(payload)})
    student_attempt = result.get("student_attempt")
    if isinstance(student_attempt, str):
        try:
            parsed = json.loads(student_attempt)
            if isinstance(parsed, dict):
                if "steps" in parsed and "steps_to_solve" not in parsed:
                    parsed["steps_to_solve"] = parsed.pop("steps")
                if "thoughts" in parsed and "thoughtprocess" not in parsed:
                    parsed["thoughtprocess"] = parsed.pop("thoughts")
                student_attempt = parsed
        except json.JSONDecodeError:
            pass

    return {
        "summary": result.get("student_summary"),
        "generated_problem": result.get("generated_problem"),
        "student_attempt": student_attempt,
        "improvement_analysis": result.get("improvement_analysis"),
        "practice_problems": result.get("practice_problems"),
    }


async def get_cache_stats() -> Dict[str, Any]:
    return await _cache.get_stats()


async def invalidate_workflow_cache(session_id: Optional[str] = None) -> Dict[str, Any]:
    """Clear workflow and batch cache entries, optionally scoped by session prefix."""
    if session_id:
        wf_deleted = await _cache.delete_pattern(f"{WORKFLOW_PREFIX}")
        batch_deleted = await _cache.delete_pattern(f"{BATCH_PREFIX}")
    else:
        wf_deleted = await _cache.delete_pattern(f"{WORKFLOW_PREFIX}")
        batch_deleted = await _cache.delete_pattern(f"{BATCH_PREFIX}")
    return {
        "workflow_deleted": wf_deleted,
        "batch_deleted": batch_deleted,
        "session_id": session_id,
    }


__all__ = [
    "run_learning_session",
    "run_full_workflow",
    "run_problem_workflow",
    "run_analysis_workflow",
    "run_adaptive_difficulty",
    "run_workflow",
    "schedule_prewarm",
    "get_prewarm_status",
    "run_batch_simulate",
    "get_cache_stats",
    "invalidate_workflow_cache",
]
