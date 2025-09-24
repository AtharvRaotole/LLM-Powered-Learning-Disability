"""LangGraph orchestrator that wires prompt handlers into a workflow graph."""
from __future__ import annotations

import json
from typing import Any, Dict, Optional

from fastapi import HTTPException
from langgraph.graph import END, StateGraph

from .langgraph_state import LearningSessionState
from .llm_client import LLMClient
from .prompt_registry import PromptRegistry


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
        self._graph = self._build_graph()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def build_initial_state(self, payload: Dict[str, Any]) -> LearningSessionState:
        """Normalize incoming payload into the shared LangGraph state."""

        metadata = dict(payload.get("metadata") or {})
        workflow_type = str(payload.get("workflow_type", metadata.get("workflow_type", "full"))).lower()
        metadata["workflow_type"] = workflow_type

        state: LearningSessionState = {
            "grade_level": payload.get("grade_level", "7th"),
            "difficulty": payload.get("difficulty", "medium"),
            "disability": payload.get("disability", "Dyslexia"),
            "metadata": metadata,
        }

        # Optional inputs
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

        # Pre-seeded problem (analysis-only workflows)
        if "problem" in payload and payload["problem"] is not None:
            provided_problem = payload["problem"]
            if isinstance(provided_problem, dict):
                state["problem"] = provided_problem
            else:
                text = str(provided_problem).strip()
                if text:
                    state["problem"] = {"problem": text}
            metadata["use_provided_problem"] = True

        # Pre-seeded student attempt
        if "student_attempt" in payload and payload["student_attempt"] is not None:
            try:
                state["student_attempt"] = self.llm_client.ensure_dict(payload["student_attempt"])
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            metadata.setdefault("student_attempt_source", "provided")

        # Student history might arrive as JSON string
        if "student_history" in state and isinstance(state["student_history"], str):
            try:
                parsed_history = json.loads(state["student_history"])
                if isinstance(parsed_history, list):
                    state["student_history"] = parsed_history
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="student_history must be a JSON array")

        return state

    def sanitize_state(self, state: LearningSessionState) -> LearningSessionState:
        """Remove internal metadata keys when returning data to callers."""

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
        """Convert LangGraph state into frontend-friendly response shape."""

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

        # Remove empty sections to keep payload concise
        filtered_results = {k: v for k, v in results.items() if v}

        return {
            "workflow_type": workflow_type,
            "current_step": current_step,
            "results": filtered_results,
            "metadata": {
                "grade_level": state.get("grade_level"),
                "difficulty": state.get("difficulty"),
                "disability": state.get("disability"),
            },
        }

    async def generate_problem(
        self,
        grade_level: str,
        difficulty: str,
        *,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        handler = self.registry.get("generate_problem")
        payload = await self.llm_client.invoke(
            handler,
            grade_level,
            difficulty,
            use_cache=use_cache,
        )
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Problem generation returned invalid payload")
        return payload

    async def run_graph(self, state: LearningSessionState) -> LearningSessionState:
        """Execute the compiled LangGraph graph with the provided state."""

        return await self._graph.ainvoke(state)

    # ------------------------------------------------------------------
    # Internal helpers used by the graph nodes
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
        workflow.add_edge(problem_node, attempt_node)
        workflow.add_edge(attempt_node, analyze_node)
        workflow.add_edge(analyze_node, strategies_node)
        workflow.add_edge(strategies_node, tutor_node)
        workflow.add_edge(tutor_node, consistency_node)
        workflow.add_edge(consistency_node, adaptive_node)
        workflow.add_edge(adaptive_node, identify_node)
        workflow.add_edge(identify_node, END)

        return workflow.compile()

    def _workflow_type(self, state: LearningSessionState) -> str:
        metadata = state.get("metadata") or {}
        return str(metadata.get("workflow_type", "full")).lower()

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

        handler = self.registry.get("generate_problem")
        grade_level = state.get("grade_level", "7th")
        difficulty = state.get("difficulty", "medium")

        payload = await self.llm_client.invoke(handler, grade_level, difficulty)
        if not isinstance(payload, dict) or not payload:
            raise HTTPException(status_code=500, detail="Problem generation returned empty payload")
        self._record_cache(state, "generate_problem")
        return {"problem": payload}

    async def _simulate_attempt_node(self, state: LearningSessionState) -> Dict[str, Any]:
        if state.get("student_attempt"):
            attempt_payload = self.llm_client.ensure_dict(state["student_attempt"])  # type: ignore[arg-type]
            return {"student_attempt": attempt_payload}

        problem = state.get("problem", {})
        problem_text = problem.get("problem") if isinstance(problem, dict) else None
        disability = state.get("disability", "Dyslexia")

        if not problem_text:
            raise HTTPException(status_code=400, detail="Problem text missing for attempt simulation")

        handler = self.registry.get("simulate_student")
        payload = await self.llm_client.invoke(handler, disability, problem_text)
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Student attempt returned invalid payload")
        self._record_cache(state, "simulate_attempt")
        return {"student_attempt": payload}

    async def _analyze_attempt_node(self, state: LearningSessionState) -> Dict[str, Any]:
        problem = state.get("problem", {})
        attempt = state.get("student_attempt")
        disability = state.get("disability", "Dyslexia")

        if not problem or not attempt:
            return {}

        problem_text = problem.get("problem", "") if isinstance(problem, dict) else str(problem)
        attempt_json = self.llm_client.dumps(attempt)

        handler = self.registry.get("analyze_thought")
        payload = await self.llm_client.invoke(handler, disability, problem_text, attempt_json)
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Thought analysis returned invalid payload")
        self._record_cache(state, "analyze_attempt")
        return {"thought_analysis": payload}

    async def _strategy_node(self, state: LearningSessionState) -> Dict[str, Any]:
        if not state.get("thought_analysis"):
            return {}

        problem = state.get("problem", {})
        attempt = state.get("student_attempt", {})
        disability = state.get("disability", "Dyslexia")
        thought = state.get("thought_analysis", {})

        problem_text = problem.get("problem", "") if isinstance(problem, dict) else str(problem)
        attempt_json = self.llm_client.dumps(attempt)
        thought_json = self.llm_client.dumps(thought)

        handler = self.registry.get("teaching_strategies")
        payload = await self.llm_client.invoke(handler, disability, problem_text, attempt_json, thought_json)
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Teaching strategies returned invalid payload")
        self._record_cache(state, "strategies")
        return {"strategies": payload}

    async def _tutor_node(self, state: LearningSessionState) -> Dict[str, Any]:
        if not state.get("thought_analysis"):
            return {}

        problem = state.get("problem", {})
        attempt = state.get("student_attempt", {})
        disability = state.get("disability", "Dyslexia")
        thought = state.get("thought_analysis", {})

        problem_text = problem.get("problem", "") if isinstance(problem, dict) else str(problem)
        attempt_json = self.llm_client.dumps(attempt)
        thought_json = self.llm_client.dumps(thought)

        handler = self.registry.get("tutor_session")
        payload = await self.llm_client.invoke(handler, disability, problem_text, attempt_json, thought_json)
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Tutor session returned invalid payload")
        self._record_cache(state, "tutor")
        return {"tutor_session": payload}

    async def _consistency_node(self, state: LearningSessionState) -> Dict[str, Any]:
        problem = state.get("problem", {})
        attempt = state.get("student_attempt")
        disability = state.get("disability", "Dyslexia")

        if not problem or not attempt:
            return {}

        problem_text = problem.get("problem", "") if isinstance(problem, dict) else str(problem)
        expected_answer = problem.get("answer") if isinstance(problem, dict) else ""
        attempt_json = self.llm_client.dumps(attempt)

        handler = self.registry.get("consistency_validation")
        payload = await self.llm_client.invoke(handler, problem_text, disability, attempt_json, expected_answer or "")
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Consistency validation returned invalid payload")
        self._record_cache(state, "consistency")
        return {"consistency_report": payload}

    async def _adaptive_difficulty_node(self, state: LearningSessionState) -> Dict[str, Any]:
        history = state.get("student_history")
        if not history:
            return {}

        current_difficulty = state.get("difficulty", "medium")

        handler = self.registry.get("adaptive_difficulty")
        payload = await self.llm_client.invoke(handler, history, current_difficulty)
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Adaptive difficulty returned invalid payload")
        self._record_cache(state, "adaptive")
        return {"adaptive_plan": payload}

    async def _identify_disability_node(self, state: LearningSessionState) -> Dict[str, Any]:
        student_response = state.get("student_response")
        if not student_response:
            return {}

        problem = state.get("problem", {})
        problem_text = problem.get("problem") if isinstance(problem, dict) else None
        if not problem_text:
            return {}

        handler = self.registry.get("identify_disability")
        payload = await self.llm_client.invoke(handler, problem_text, student_response)
        if not isinstance(payload, dict):
            raise HTTPException(status_code=500, detail="Disability analysis returned invalid payload")
        self._record_cache(state, "identify")
        return {"disability_analysis": payload}


__all__ = ["LangGraphOrchestrator"]
