import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import DisabilitiesEnum from "../Store/Disabilities";
import { useAuth } from "../Store/AuthContext";
import SessionManager from "../Utils/SessionManager";
import { getOrRunFullWorkflow, triggerPrewarm, getPrewarmStatus } from "../Utils/langgraphApi";
import {
    getPrewarmPayload,
    getProblemObject,
    getSessionId,
    getWorkflowPayload,
    PROBLEM_CHANGED_EVENT,
} from "../Utils/workflowSession";

const WorkflowContext = createContext(null);

export function WorkflowProvider() {
    const { id } = useParams();
    const disability = DisabilitiesEnum[id];
    const { user } = useAuth();
    const [workflow, setWorkflow] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const savedWorkflowRef = useRef(null);

    const loadWorkflow = useCallback(async (options = {}) => {
        if (!disability) return;
        const payload = getWorkflowPayload(disability);
        if (!payload.problem) {
            setError("No problem found. Generate a problem first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const data = await getOrRunFullWorkflow(payload, {
                forceRefresh: Boolean(options.forceRefresh),
            });
            setWorkflow(data);
        } catch (err) {
            setError(err?.message || "Failed to load workflow.");
            console.error("Workflow load error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [disability]);

    useEffect(() => {
        setWorkflow(null);
        loadWorkflow();
    }, [loadWorkflow]);

    useEffect(() => {
        const handleProblemChanged = () => {
            setWorkflow(null);
            loadWorkflow({ forceRefresh: true });
        };
        window.addEventListener(PROBLEM_CHANGED_EVENT, handleProblemChanged);
        return () => window.removeEventListener(PROBLEM_CHANGED_EVENT, handleProblemChanged);
    }, [loadWorkflow]);

    useEffect(() => {
        if (!workflow?.results || !disability || isLoading || error) return;

        const saveKey = `${getSessionId()}:${id}:${workflow.metadata?.generated_at || "cached"}`;
        if (savedWorkflowRef.current === saveKey) return;
        savedWorkflowRef.current = saveKey;

        const problem = getProblemObject();
        const simulation = workflow.results.student_simulation || {};

        SessionManager.saveSession(
            {
                disability,
                disability_id: id,
                problem: problem.problem,
                answer: simulation.final_answer || simulation.studentAnswer || problem.answer,
                approach: simulation.thoughtprocess || simulation.approach || "",
                consistency_score: workflow.metadata?.consistency_score
                    ?? workflow.results?.consistency_validation?.overall_consistency_score,
                consistencyResults: workflow.results?.consistency_validation,
                gradeLevel: problem.grade_level,
                difficulty: problem.difficulty,
            },
            user?.id ?? null
        ).catch((err) => console.error("Failed to save session:", err));
    }, [workflow, disability, id, user, isLoading, error]);

    const value = useMemo(
        () => ({
            workflow,
            isLoading,
            error,
            disability,
            reload: loadWorkflow,
            results: workflow?.results || {},
            metadata: workflow?.metadata || {},
        }),
        [workflow, isLoading, error, disability, loadWorkflow]
    );

    return (
        <WorkflowContext.Provider value={value}>
            <Outlet />
        </WorkflowContext.Provider>
    );
}

export function useWorkflow() {
    const ctx = useContext(WorkflowContext);
    if (!ctx) {
        throw new Error("useWorkflow must be used within WorkflowProvider");
    }
    return ctx;
}

export async function prewarmAfterProblem(disability) {
    if (!disability) return null;
    const payload = getPrewarmPayload(disability);
    if (!payload) return null;
    const result = await triggerPrewarm(payload);
    return result?.session_key || getSessionId();
}

export async function waitForPrewarm(sessionKey, { maxAttempts = 60, intervalMs = 1000 } = {}) {
    for (let i = 0; i < maxAttempts; i += 1) {
        const status = await getPrewarmStatus(sessionKey);
        if (status.status === "complete") return true;
        if (status.status === "failed") return false;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return false;
}

export function ConsistencyBadge({ score }) {
    if (score == null) return null;
    const pct = Math.round(score * 100);
    const tone = score >= 0.7 ? "good" : score >= 0.5 ? "warn" : "bad";
    return (
        <span
            style={{
                display: "inline-block",
                marginLeft: 8,
                padding: "2px 8px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                background: tone === "good" ? "#dcfce7" : tone === "warn" ? "#fef9c3" : "#fee2e2",
                color: tone === "good" ? "#166534" : tone === "warn" ? "#854d0e" : "#991b1b",
            }}
        >
            Consistency {pct}%
        </span>
    );
}
