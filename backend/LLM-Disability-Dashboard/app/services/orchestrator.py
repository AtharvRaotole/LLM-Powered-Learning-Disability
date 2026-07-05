"""LangGraph orchestrator that wires prompt handlers into a workflow graph."""
from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import HTTPException
from langgraph.graph import END, StateGraph

from .attempt_normalizer import (
    is_correct_answer,
    normalize_attempt,
    patch_attempt_for_consistency,
)
from .consistency_validator import CONSISTENCY_THRESHOLD, validate_response_consistency
from .problem_validator import validate_problem_consistency
from .disability_registry import normalize_disability
from .grade_registry import DEFAULT_DIFFICULTY, DEFAULT_GRADE_LEVEL, normalize_difficulty, normalize_grade_level
from .langgraph_state import LearningSessionState
from .llm_client import LLMClient
from .prompt_registry import PromptRegistry
from .prompts import get_workflow_prompts

logger = logging.getLogger(__name__)

SIMULATE_TEMPERATURES = (0.7, 0.5, 0.3)
MAX_SIMULATE_RETRIES = 2
PROBLEM_GENERATION_TEMPERATURES = (0.5, 0.3, 0.2)
MAX_PROBLEM_RETRIES = 3


class LangGraphOrchestrator:
    """Builds and executes the LangGraph workflow for learning sessions."""

    def __init__(
        self,
        *,
        registry: Optional[PromptRegistry] = None,
        llm_client: Optional[LLMClient] = None,
    ) -> None:
        self.registry = registry or PromptRegistry()
        self.llm_client = llm_client or LLMClient()
        self.prompts = get_workflow_prompts()
        self._checkpointer = self._create_checkpointer()
        self._graph = self._build_graph()

    def _create_checkpointer(self):
        try:
            from langgraph.checkpoint.sqlite import SqliteSaver

            db_path = Path(__file__).resolve().parents[2] / "data" / "checkpoints.db"
            db_path.parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(str(db_path), check_same_thread=False)
            return SqliteSaver(conn)
        except Exception as exc:
            logger.warning("Checkpointer unavailable, running without persistence: %s", exc)
            return None

    def build_initial_state(self, payload: Dict[str, Any]) -> LearningSessionState:
        metadata = dict(payload.get("metadata") or {})
        workflow_type = str(payload.get("workflow_type", metadata.get("workflow_type", "full"))).lower()
        metadata["workflow_type"] = workflow_type
        if workflow_type == "pre_tutor" and not metadata.get("stop_after"):
            metadata["stop_after"] = "strategies"

        disability = normalize_disability(str(payload.get("disability", "Dyslexia")))

        state: LearningSessionState = {
            "grade_level": normalize_grade_level(payload.get("grade_level", DEFAULT_GRADE_LEVEL)),
            "difficulty": normalize_difficulty(payload.get("difficulty", DEFAULT_DIFFICULTY)),
            "disability": disability,
            "metadata": metadata,
        }

        for key in (
            "student_history",
            "student_response",
            "thought_analysis",
            "strategies",
            "tutor_session",
            "consistency_report",
            "adaptive_plan",
            "disability_analysis",
        ):
            if key in payload and payload[key] is not None:
                state[key] = payload[key]

        if "problem" in payload and payload["problem"] is not None:
            provided_problem = payload["problem"]
            if isinstance(provided_problem, dict):
                state["problem"] = provided_problem
            else:
                text = str(provided_problem).strip()
                if text:
                    state["problem"] = {"problem": text}
            metadata["use_provided_problem"] = True

        if "student_attempt" in payload and payload["student_attempt"] is not None:
            try:
                state["student_attempt"] = self.llm_client.ensure_dict(payload["student_attempt"])
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            metadata.setdefault("student_attempt_source", "provided")

        if "student_history" in state and isinstance(state["student_history"], str):
            try:
                parsed_history = json.loads(state["student_history"])
                if isinstance(parsed_history, list):
                    state["student_history"] = parsed_history
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="student_history must be a JSON array")

        return state

    def sanitize_state(self, state: LearningSessionState) -> LearningSessionState:
        sanitized: LearningSessionState = {}
        for key, value in state.items():
            if key == "metadata":
                if value:
                    sanitized[key] = value
                continue
            if value is not None:
                sanitized[key] = value
        return sanitized

    def format_workflow_results(
        self,
        state: LearningSessionState,
        *,
        workflow_type: str,
        current_step: str = "completed",
    ) -> Dict[str, Any]:
        metadata = dict(state.get("metadata") or {})
        consistency = state.get("consistency_report") or {}
        problem_payload = state.get("problem") if isinstance(state.get("problem"), dict) else {}
        metadata_out = {
            "grade_level": state.get("grade_level"),
            "difficulty": state.get("difficulty"),
            "disability": state.get("disability"),
            "cache_status": metadata.get("cache_status", {}),
            "consistency_score": consistency.get("overall_consistency_score"),
            "prewarm_status": metadata.get("prewarm_status"),
            "answer_validated": bool(problem_payload.get("answer_validated")),
        }

        results = {
            "generated_problem": state.get("problem"),
            "student_simulation": state.get("student_attempt"),
            "thought_analysis": state.get("thought_analysis"),
            "teaching_strategies": state.get("strategies"),
            "tutor_session": state.get("tutor_session"),
            "consistency_validation": state.get("consistency_report"),
            "adaptive_plan": state.get("adaptive_plan"),
            "disability_analysis": state.get("disability_analysis"),
        }
        filtered_results = {k: v for k, v in results.items() if v}

        return {
            "workflow_type": workflow_type,
            "current_step": current_step,
            "results": filtered_results,
            "metadata": metadata_out,
        }

    async def _generate_validated_problem(
        self,
        grade_level: str,
        difficulty: str,
        *,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """Generate a problem and retry until answer matches solution steps."""
        prompt = self.prompts.get_problem_generation_prompt(grade_level, difficulty)
        last_validation: Dict[str, Any] = {}

        for attempt_idx in range(MAX_PROBLEM_RETRIES):
            temperature = PROBLEM_GENERATION_TEMPERATURES[
                min(attempt_idx, len(PROBLEM_GENERATION_TEMPERATURES) - 1)
            ]
            attempt_use_cache = use_cache and attempt_idx == 0
            payload = await self.llm_client.invoke_with_prompt(
                prompt=prompt,
                model="gpt-4o-mini",
                temperature=temperature,
                use_cache=attempt_use_cache,
            )

            if not isinstance(payload, dict) or not payload:
                last_validation = {"details": "Problem generation returned empty payload"}
                continue

            validation = validate_problem_consistency(payload)
            last_validation = validation
            if validation.get("valid"):
                payload["answer_validated"] = True
                return payload

            logger.warning(
                "Problem answer/solution mismatch (attempt %s/%s): %s",
                attempt_idx + 1,
                MAX_PROBLEM_RETRIES,
                validation.get("details"),
            )

        detail = last_validation.get("details", "Unknown validation failure")
        raise HTTPException(
            status_code=502,
            detail=f"Could not generate a consistent problem after {MAX_PROBLEM_RETRIES} attempts: {detail}",
        )

    async def generate_problem(
        self,
        grade_level: str,
        difficulty: str,
        *,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        return await self._generate_validated_problem(
            grade_level,
            difficulty,
            use_cache=use_cache,
        )

    async def run_graph(self, state: LearningSessionState) -> LearningSessionState:
        metadata = state.get("metadata") or {}
        session_id = metadata.get("session_id") or metadata.get("workflow_key") or "default"
        config = {"configurable": {"thread_id": str(session_id)}}
        if self._checkpointer is not None:
            return await self._graph.ainvoke(state, config=config)
        return await self._graph.ainvoke(state)

    async def simulate_attempt_only(self, state: LearningSessionState) -> Dict[str, Any]:
        """Run simulate + validate for batch comparison flows."""
        result = await self._simulate_attempt_node(state)
        return result

    # ------------------------------------------------------------------
    # Graph construction
    # ------------------------------------------------------------------
    def _build_graph(self):
        workflow = StateGraph(LearningSessionState)

        problem_node = "generate_problem_step"
        attempt_node = "simulate_attempt_step"
        analyze_node = "analyze_attempt_step"
        strategies_node = "strategies_step"
        tutor_node = "tutor_step"
        consistency_node = "consistency_step"
        adaptive_node = "adaptive_step"
        identify_node = "identify_step"

        workflow.add_node(problem_node, self._generate_problem_node)
        workflow.add_node(attempt_node, self._simulate_attempt_node)
        workflow.add_node(analyze_node, self._analyze_attempt_node)
        workflow.add_node(strategies_node, self._strategy_node)
        workflow.add_node(tutor_node, self._tutor_node)
        workflow.add_node(consistency_node, self._consistency_node)
        workflow.add_node(adaptive_node, self._adaptive_difficulty_node)
        workflow.add_node(identify_node, self._identify_disability_node)

        workflow.set_entry_point(problem_node)
        workflow.add_conditional_edges(
            problem_node,
            self._route_after_problem,
            {attempt_node: attempt_node, END: END},
        )
        workflow.add_conditional_edges(
            attempt_node,
            self._route_after_attempt,
            {analyze_node: analyze_node, consistency_node: consistency_node},
        )
        workflow.add_edge(analyze_node, strategies_node)
        workflow.add_edge(strategies_node, tutor_node)
        workflow.add_edge(tutor_node, consistency_node)
        workflow.add_conditional_edges(
            consistency_node,
            self._route_after_consistency,
            {adaptive_node: adaptive_node, END: END},
        )
        workflow.add_edge(adaptive_node, identify_node)
        workflow.add_edge(identify_node, END)

        if self._checkpointer is not None:
            return workflow.compile(checkpointer=self._checkpointer)
        return workflow.compile()

    def _route_after_problem(self, state: LearningSessionState) -> str:
        metadata = state.get("metadata") or {}
        if metadata.get("simulate_only"):
            return "simulate_attempt_step"
        if state.get("student_attempt") and metadata.get("simulate_only"):
            return END
        return "simulate_attempt_step"

    def _route_after_attempt(self, state: LearningSessionState) -> str:
        metadata = state.get("metadata") or {}
        if metadata.get("simulate_only"):
            return "consistency_step"
        return "analyze_attempt_step"

    def _route_after_consistency(self, state: LearningSessionState) -> str:
        metadata = state.get("metadata") or {}
        if metadata.get("simulate_only"):
            return END
        return "adaptive_step"

    def _workflow_type(self, state: LearningSessionState) -> str:
        metadata = state.get("metadata") or {}
        return str(metadata.get("workflow_type", "full")).lower()

    def _stop_after(self, state: LearningSessionState) -> str:
        metadata = state.get("metadata") or {}
        return str(metadata.get("stop_after", "")).lower()

    def _record_cache(self, state: LearningSessionState, node: str) -> None:
        metadata = state.setdefault("metadata", {})
        cache_info = metadata.setdefault("cache_status", {})
        cache_info[node] = self.llm_client.last_cache_hit

    async def _generate_problem_node(self, state: LearningSessionState) -> Dict[str, Any]:
        workflow_type = self._workflow_type(state)
        metadata = state.get("metadata") or {}

        if metadata.get("use_provided_problem"):
            return {}

        if workflow_type == "analysis_only" and state.get("problem"):
            return {}

        grade_level = normalize_grade_level(state.get("grade_level", DEFAULT_GRADE_LEVEL))
        difficulty = normalize_difficulty(state.get("difficulty", DEFAULT_DIFFICULTY))
        use_cache = not metadata.get("refresh_problem", False)
        payload = await self._generate_validated_problem(
            grade_level,
            difficulty,
            use_cache=use_cache,
        )
        self._record_cache(state, "generate_problem")
        return {"problem": payload}

    async def _simulate_attempt_node(self, state: LearningSessionState) -> Dict[str, Any]:
        if state.get("student_attempt") and not (state.get("metadata") or {}).get("force_resimulate"):
            attempt_payload = self.llm_client.ensure_dict(state["student_attempt"])
            return {"student_attempt": attempt_payload}

        problem = state.get("problem", {})
        problem_text = problem.get("problem") if isinstance(problem, dict) else None
        disability = state.get("disability", "Dyslexia")

        if not problem_text:
            raise HTTPException(status_code=400, detail="Problem text missing for attempt simulation")

        metadata = state.get("metadata") or {}
        target = metadata.get("target_correctness", "")
        expected = ""
        if isinstance(problem, dict):
            expected = str(problem.get("answer") or "").strip()

        default_error_styles = {
            "Dyslexia": "digit_reversal",
            "Dyscalculia": "operation_confusion",
            "Attention Deficit Hyperactivity Disorder": "skipped_step",
            "Dysgraphia": "miscopy_digit",
            "Auditory Processing Disorder": "misheard_number",
            "Non verbal Learning Disorder": "visual_misread",
            "Language Processing Disorder": "language_misinterpretation",
        }
        error_style = metadata.get("error_style") or default_error_styles.get(disability, "operation_confusion")

        use_cache = not (str(target).lower() == "likely_incorrect")
        consistency_report: Optional[Dict[str, Any]] = None
        final_attempt: Optional[Dict[str, Any]] = None

        for attempt_idx in range(MAX_SIMULATE_RETRIES + 1):
            temperature = SIMULATE_TEMPERATURES[min(attempt_idx, len(SIMULATE_TEMPERATURES) - 1)]
            prompts = self.prompts.get_student_attempt_prompt(
                disability=disability,
                problem=problem_text,
                target_correctness=target,
                expected_answer=expected,
                error_style=error_style,
            )
            retry_note = ""
            if attempt_idx > 0:
                retry_note = (
                    " Previous attempt failed consistency checks. Ensure final_answer appears "
                    "in steps_to_solve and differs from the expected correct answer."
                )
            chat_messages = [
                {"role": "system", "content": prompts["system"] + retry_note},
                {"role": "user", "content": prompts["user"]},
            ]
            payload = await self.llm_client.invoke_chat(
                messages=chat_messages,
                model="gpt-4o-mini",
                temperature=temperature,
                use_cache=use_cache and attempt_idx == 0,
            )

            if not isinstance(payload, dict):
                raise HTTPException(status_code=500, detail="Student attempt returned invalid payload")

            if expected and is_correct_answer(payload, expected) and attempt_idx < MAX_SIMULATE_RETRIES:
                continue

            normalized = normalize_attempt(payload, expected)
            consistency_report = validate_response_consistency(
                problem_text, disability, normalized, expected
            )
            score = consistency_report.get("overall_consistency_score", 0.0)

            if score >= CONSISTENCY_THRESHOLD or attempt_idx >= MAX_SIMULATE_RETRIES:
                if score < CONSISTENCY_THRESHOLD:
                    normalized = patch_attempt_for_consistency(normalized)
                    consistency_report = validate_response_consistency(
                        problem_text, disability, normalized, expected
                    )
                final_attempt = normalized
                break

        if final_attempt is None:
            final_attempt = normalize_attempt(payload if isinstance(payload, dict) else {}, expected)

        self._record_cache(state, "simulate_attempt")
        result: Dict[str, Any] = {"student_attempt": final_attempt}
        if consistency_report:
            result["consistency_report"] = consistency_report
        return result

    async def _analyze_attempt_node(self, state: LearningSessionState) -> Dict[str, Any]:
        metadata = state.get("metadata") or {}
        if metadata.get("simulate_only"):
            return {}
        if state.get("thought_analysis"):
            return {}
        problem = state.get("problem", {})
        attempt = state.get("student_attempt")
        disability = state.get("disability", "Dyslexia")

        if not problem or not attempt:
            return {}

        problem_text = problem.get("problem", "") if isinstance(problem, dict) else str(problem)
        attempt_json = self.llm_client.dumps(attempt)

        prompt = self.prompts.get_thought_analysis_prompt(
            disability=disability,
            problem=problem_text,
            attempt_json=attempt_json,
        )

        payload = await self.llm_client.invoke_with_prompt(
            prompt=prompt,
            model="gpt-4o-mini",
            temperature=0.3,
        )

        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Thought analysis returned invalid payload")
        self._record_cache(state, "analyze_attempt")
        return {"thought_analysis": payload}

    async def _strategy_node(self, state: LearningSessionState) -> Dict[str, Any]:
        metadata = state.get("metadata") or {}
        if metadata.get("simulate_only"):
            return {}
        if not state.get("thought_analysis") or state.get("strategies"):
            return {}

        problem = state.get("problem", {})
        attempt = state.get("student_attempt", {})
        disability = state.get("disability", "Dyslexia")
        thought = state.get("thought_analysis", {})

        problem_text = problem.get("problem", "") if isinstance(problem, dict) else str(problem)
        attempt_json = self.llm_client.dumps(attempt)
        thought_json = self.llm_client.dumps(thought)

        prompt = self.prompts.get_teaching_strategies_prompt(
            disability=disability,
            problem=problem_text,
            attempt_json=attempt_json,
            thought_json=thought_json,
        )

        payload = await self.llm_client.invoke_with_prompt(
            prompt=prompt,
            model="gpt-4o-mini",
            temperature=0.4,
        )

        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Teaching strategies returned invalid payload")
        self._record_cache(state, "strategies")
        return {"strategies": payload}

    async def _tutor_node(self, state: LearningSessionState) -> Dict[str, Any]:
        metadata = state.get("metadata") or {}
        if metadata.get("simulate_only"):
            return {}
        if self._stop_after(state) in {"analysis", "strategies"}:
            return {}
        if not state.get("thought_analysis") or state.get("tutor_session"):
            return {}

        problem = state.get("problem", {})
        attempt = state.get("student_attempt", {})
        disability = state.get("disability", "Dyslexia")
        thought = state.get("thought_analysis", {})

        problem_text = problem.get("problem", "") if isinstance(problem, dict) else str(problem)
        attempt_json = self.llm_client.dumps(attempt)
        thought_json = self.llm_client.dumps(thought)

        prompt = self.prompts.get_tutor_session_prompt(
            disability=disability,
            problem=problem_text,
            attempt_json=attempt_json,
            thought_json=thought_json,
        )

        payload = await self.llm_client.invoke_with_prompt(
            prompt=prompt,
            model="gpt-4o-mini",
            temperature=0.7,
        )

        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Tutor session returned invalid payload")
        self._record_cache(state, "tutor")
        return {"tutor_session": payload}

    async def _consistency_node(self, state: LearningSessionState) -> Dict[str, Any]:
        if self._stop_after(state) in {"analysis", "strategies", "tutor"}:
            return {}
        if state.get("consistency_report"):
            return {}

        problem = state.get("problem", {})
        attempt = state.get("student_attempt")
        disability = state.get("disability", "Dyslexia")

        if not problem or not attempt:
            return {}

        problem_text = problem.get("problem", "") if isinstance(problem, dict) else str(problem)
        expected_answer = str(problem.get("answer") or "") if isinstance(problem, dict) else ""
        normalized = normalize_attempt(self.llm_client.ensure_dict(attempt), expected_answer)
        report = validate_response_consistency(problem_text, disability, normalized, expected_answer)
        return {"consistency_report": report, "student_attempt": normalized}

    async def _adaptive_difficulty_node(self, state: LearningSessionState) -> Dict[str, Any]:
        if self._stop_after(state) in {"analysis", "strategies", "tutor", "consistency"}:
            return {}
        history = state.get("student_history")
        if not history or state.get("adaptive_plan"):
            return {}

        current_difficulty = normalize_difficulty(state.get("difficulty", DEFAULT_DIFFICULTY))
        prompt = self.prompts.get_adaptive_difficulty_prompt(
            history=history,
            current_difficulty=current_difficulty,
        )

        payload = await self.llm_client.invoke_with_prompt(
            prompt=prompt,
            model="gpt-4o-mini",
            temperature=0.3,
        )

        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Adaptive difficulty returned invalid payload")
        self._record_cache(state, "adaptive")
        return {"adaptive_plan": payload}

    async def _identify_disability_node(self, state: LearningSessionState) -> Dict[str, Any]:
        if self._stop_after(state) in {"analysis", "strategies", "tutor", "consistency", "adaptive"}:
            return {}
        student_response = state.get("student_response")
        if not student_response or state.get("disability_analysis"):
            return {}

        problem = state.get("problem", {})
        problem_text = problem.get("problem") if isinstance(problem, dict) else None
        if not problem_text:
            return {}

        prompt = self.prompts.get_disability_identification_prompt(
            problem=problem_text,
            student_response=student_response,
        )

        payload = await self.llm_client.invoke_with_prompt(
            prompt=prompt,
            model="gpt-4o-mini",
            temperature=0.2,
        )

        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Disability analysis returned invalid payload")
        self._record_cache(state, "identify")
        return {"disability_analysis": payload}


__all__ = ["LangGraphOrchestrator"]
