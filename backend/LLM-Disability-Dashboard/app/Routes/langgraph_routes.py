"""FastAPI routes exposing LangGraph-powered workflows."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel, Field, field_validator

from app.limiter import limiter
from app.services.langgraph_service import (
    get_cache_stats,
    get_prewarm_status,
    invalidate_workflow_cache,
    run_adaptive_difficulty,
    run_analysis_workflow,
    run_batch_simulate,
    run_full_workflow,
    run_improvement_graph,
    run_learning_session,
    run_problem_workflow,
    run_workflow,
    schedule_prewarm,
)
from app.services.disability_assessment_service import start_assessment, evaluate_assessment
from app.services.grade_registry import (
    DEFAULT_DIFFICULTY,
    DEFAULT_GRADE_LEVEL,
    DIFFICULTY_LEVELS,
    GRADE_LEVELS,
    validate_difficulty,
    validate_grade_level,
)


def _coerce_grade(value: str) -> str:
    return validate_grade_level(value)


def _coerce_difficulty(value: str) -> str:
    return validate_difficulty(value)


class LangGraphBaseRequest(BaseModel):
    grade_level: str = Field(default=DEFAULT_GRADE_LEVEL, description="Student grade level")
    difficulty: str = Field(default=DEFAULT_DIFFICULTY, description="Problem difficulty")
    disability: str = Field(default="Dyslexia", description="Learning disability to simulate")
    student_history: Optional[Union[List[Dict[str, Any]], str]] = None
    student_attempt: Optional[Union[Dict[str, Any], str]] = None
    student_response: Optional[str] = None
    problem: Optional[Union[Dict[str, Any], str]] = None
    metadata: Optional[Dict[str, Any]] = None
    workflow_type: Optional[str] = Field(default=None, description="Workflow variant override")

    @field_validator("grade_level", mode="before")
    @classmethod
    def normalize_grade(cls, value: str) -> str:
        return _coerce_grade(value)

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty_field(cls, value: str) -> str:
        return _coerce_difficulty(value)

    def to_payload(self, workflow_type: Optional[str] = None) -> Dict[str, Any]:
        payload = self.model_dump(exclude_none=True)
        if workflow_type:
            payload["workflow_type"] = workflow_type
        return payload


class FullWorkflowRequest(LangGraphBaseRequest):
    workflow_type: str = Field(default="full", description="Workflow variant to execute")


class ProblemGenerationRequest(BaseModel):
    grade_level: str = Field(default=DEFAULT_GRADE_LEVEL)
    difficulty: str = Field(default=DEFAULT_DIFFICULTY)
    disability: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("grade_level", mode="before")
    @classmethod
    def normalize_grade(cls, value: str) -> str:
        return _coerce_grade(value)

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty_field(cls, value: str) -> str:
        return _coerce_difficulty(value)

    def to_payload(self) -> Dict[str, Any]:
        payload = self.model_dump(exclude_none=True)
        payload["workflow_type"] = "problem_only"
        return payload


class AnalysisWorkflowRequest(LangGraphBaseRequest):
    student_attempt: Union[Dict[str, Any], str]
    problem: Union[Dict[str, Any], str]
    workflow_type: str = Field(default="analysis_only")


class BatchSimulateRequest(BaseModel):
    problem: Union[Dict[str, Any], str]
    disabilities: List[str]
    grade_level: str = Field(default=DEFAULT_GRADE_LEVEL)
    difficulty: str = Field(default=DEFAULT_DIFFICULTY)

    @field_validator("grade_level", mode="before")
    @classmethod
    def normalize_grade(cls, value: str) -> str:
        return _coerce_grade(value)

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty_field(cls, value: str) -> str:
        return _coerce_difficulty(value)


class PrewarmRequest(LangGraphBaseRequest):
    pass


class CacheInvalidateRequest(BaseModel):
    session_id: Optional[str] = None


class AssessmentRound(BaseModel):
    question: str
    answer: str


class DisabilityAssessmentStartRequest(BaseModel):
    grade_level: str = Field(default=DEFAULT_GRADE_LEVEL)
    difficulty: str = Field(default=DEFAULT_DIFFICULTY)

    @field_validator("grade_level", mode="before")
    @classmethod
    def normalize_grade(cls, value: str) -> str:
        return _coerce_grade(value)

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty_field(cls, value: str) -> str:
        return _coerce_difficulty(value)


class DisabilityAssessmentEvaluateRequest(BaseModel):
    grade_level: str = Field(default=DEFAULT_GRADE_LEVEL)
    difficulty: str = Field(default=DEFAULT_DIFFICULTY)
    rounds: List[AssessmentRound]
    round_number: int = Field(ge=1, le=3)

    @field_validator("grade_level", mode="before")
    @classmethod
    def normalize_grade(cls, value: str) -> str:
        return _coerce_grade(value)

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty_field(cls, value: str) -> str:
        return _coerce_difficulty(value)


class AdaptiveDifficultyRequest(BaseModel):
    grade_level: str = Field(default=DEFAULT_GRADE_LEVEL)
    difficulty: str = Field(default=DEFAULT_DIFFICULTY)
    student_history: List[Dict[str, Any]] = Field(default_factory=list)

    @field_validator("grade_level", mode="before")
    @classmethod
    def normalize_grade(cls, value: str) -> str:
        return _coerce_grade(value)

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty_field(cls, value: str) -> str:
        return _coerce_difficulty(value)


langgraph_router = APIRouter()


@langgraph_router.get("/")
async def healthcheck() -> Dict[str, Any]:
    return {
        "status": "ok",
        "workflows": ["problem_only", "full", "analysis_only", "adaptive_only", "pre_tutor", "batch_simulate", "disability_assessment"],
        "grade_levels": [{"value": value, "label": label} for value, label in GRADE_LEVELS],
        "difficulty_levels": [{"value": value, "label": label} for value, label in DIFFICULTY_LEVELS],
        "defaults": {
            "grade_level": DEFAULT_GRADE_LEVEL,
            "difficulty": DEFAULT_DIFFICULTY,
        },
    }


@langgraph_router.post("/disability-assessment/start")
async def disability_assessment_start(payload: DisabilityAssessmentStartRequest) -> Dict[str, Any]:
    try:
        return await start_assessment(payload.grade_level, payload.difficulty)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/disability-assessment/evaluate")
async def disability_assessment_evaluate(payload: DisabilityAssessmentEvaluateRequest) -> Dict[str, Any]:
    try:
        rounds = [r.model_dump() for r in payload.rounds]
        return await evaluate_assessment(
            payload.grade_level,
            payload.difficulty,
            rounds,
            payload.round_number,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/adaptive-difficulty")
async def adaptive_difficulty(payload: AdaptiveDifficultyRequest) -> Dict[str, Any]:
    try:
        return await run_adaptive_difficulty(payload.model_dump())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.get("/cache-stats")
async def cache_stats() -> Dict[str, Any]:
    return await get_cache_stats()


@langgraph_router.post("/cache-invalidate")
async def cache_invalidate(payload: CacheInvalidateRequest) -> Dict[str, Any]:
    try:
        return await invalidate_workflow_cache(payload.session_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.get("/prewarm-status/{session_key}")
async def prewarm_status(session_key: str) -> Dict[str, Any]:
    return get_prewarm_status(session_key)


@langgraph_router.post("/prewarm")
async def prewarm_workflow(payload: PrewarmRequest) -> Dict[str, Any]:
    try:
        body = payload.to_payload("full")
        session_key = schedule_prewarm(body)
        return {"session_key": session_key, "status": "pending"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/batch-simulate")
async def batch_simulate(payload: BatchSimulateRequest) -> Dict[str, Any]:
    try:
        return await run_batch_simulate(payload.model_dump())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/full-workflow")
@limiter.limit("30/minute")
async def run_langgraph_full_workflow(request: Request, payload: FullWorkflowRequest) -> Dict[str, Any]:
    try:
        return await run_full_workflow(payload.to_payload("full"))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/generate-problem")
@limiter.limit("30/minute")
async def generate_problem(request: Request, payload: ProblemGenerationRequest) -> Dict[str, Any]:
    try:
        return await run_problem_workflow(payload.to_payload())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/analysis")
async def run_analysis(payload: AnalysisWorkflowRequest) -> Dict[str, Any]:
    try:
        return await run_analysis_workflow(payload.to_payload("analysis_only"))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/workflow")
async def run_dynamic_workflow(payload: LangGraphBaseRequest) -> Dict[str, Any]:
    try:
        return await run_workflow(payload.to_payload(payload.workflow_type))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/session")
async def run_langgraph_session(payload: LangGraphBaseRequest) -> Dict[str, Any]:
    try:
        return await run_learning_session(payload.to_payload())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@langgraph_router.post("/improvement_analysis")
async def run_improvement_analysis(payload: dict = Body(...)):
    try:
        return await run_improvement_graph(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
