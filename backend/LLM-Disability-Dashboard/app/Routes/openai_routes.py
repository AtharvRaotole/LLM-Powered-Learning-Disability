from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from app.services import Problem, Thought, Attempt, Strategies, Tutor, IdentifyDisability
from app.services.consistency_validator import validate_consistency
from app.services.adaptive_difficulty import get_adaptive_difficulty
from app.limiter import limiter

openai_router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    chat_mode: str = Field(default="tutor", max_length=32)
    personality: str = Field(default="helpful", max_length=32)
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list, max_length=20)
    problem_context: Optional[Dict[str, Any]] = None


@openai_router.get("/generate_problem")
async def generateProblem(grade_level: str = "5th", difficulty: str = "medium"):
    from app.services.grade_registry import normalize_difficulty, normalize_grade_level

    try:
        response = await Problem(
            normalize_grade_level(grade_level),
            normalize_difficulty(difficulty),
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@openai_router.post("/generate_thought")
async def generateThought(request: Request):
    try:
        data = await request.json()
        disability = data.get("disability")
        problem = data.get("problem")
        student_attempt = data.get("student_attempt", "")
        if not disability or not problem:
            raise HTTPException(status_code=400, detail="disability and problem are required")
        response = await Thought(disability, problem, student_attempt)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@openai_router.post("/generate_strategies")
async def generateStrategies(request: Request):
    try:
        data = await request.json()
        disability = data.get("disability")
        problem = data.get("problem")
        student_attempt = data.get("student_attempt", "")
        thought_analysis = data.get("thought_analysis", "")
        if not disability or not problem:
            raise HTTPException(status_code=400, detail="disability and problem are required")
        response = await Strategies(disability, problem, student_attempt, thought_analysis)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@openai_router.post("/generate_attempt")
async def generateAttempt(request: Request):
    try:
        data = await request.json()
        disability = data.get("disability")
        problem = data.get("problem")
        if not disability or not problem:
            raise HTTPException(status_code=400, detail="disability and problem are required")
        response = await Attempt(disability, problem)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@openai_router.post("/generate_tutor")
async def generateTutor(request: Request):
    try:
        data = await request.json()
        disability = data.get("disability")
        problem = data.get("problem")
        student_attempt = data.get("student_attempt", "")
        thought_analysis = data.get("thought_analysis", "")
        if not disability or not problem:
            raise HTTPException(status_code=400, detail="disability and problem are required")
        response = await Tutor(disability, problem, student_attempt, thought_analysis)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@openai_router.post("/identify_disability")
async def identifyDisability(request: Request):
    try:
        data = await request.json()
        problem = data.get("problem")
        student_response = data.get("student_response")
        if not problem or not student_response:
            raise HTTPException(status_code=400, detail="problem and student_response are required")
        response = await IdentifyDisability(problem, student_response)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@openai_router.post("/validate_consistency")
async def validateConsistency(request: Request):
    try:
        data = await request.json()
        problem = data.get("problem")
        disability = data.get("disability")
        student_attempt = data.get("student_attempt")
        expected_answer = data.get("expected_answer")
        if not all([problem, disability, student_attempt, expected_answer]):
            raise HTTPException(
                status_code=400,
                detail="problem, disability, student_attempt, and expected_answer are required",
            )
        response = await validate_consistency(problem, disability, student_attempt, expected_answer)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@openai_router.post("/adaptive_difficulty")
async def adaptiveDifficulty(request: Request):
    try:
        data = await request.json()
        student_history = data.get("student_history", [])
        current_difficulty = data.get("current_difficulty", "medium")
        if not current_difficulty:
            raise HTTPException(status_code=400, detail="current_difficulty is required")
        response = await get_adaptive_difficulty(student_history, current_difficulty)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@openai_router.post("/chat")
@limiter.limit("30/minute")
async def chatWithAI(request: Request, payload: ChatRequest):
    try:
        from app.services.openai_service import chat_with_ai

        problem_context = payload.problem_context
        if isinstance(problem_context, dict):
            problem_text = str(problem_context.get("problem", ""))[:8000]
            problem_context = {
                "problem": problem_text,
                "answer": str(problem_context.get("answer", ""))[:256],
            }

        history = payload.conversation_history[:10]
        return await chat_with_ai(
            payload.message,
            payload.chat_mode,
            payload.personality,
            history,
            problem_context,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
