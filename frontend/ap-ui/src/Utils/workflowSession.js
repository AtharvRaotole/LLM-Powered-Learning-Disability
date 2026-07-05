import {
    DEFAULT_DIFFICULTY,
    DEFAULT_GRADE_LEVEL,
    readStoredDifficulty,
    readStoredGradeLevel,
} from "./gradeConfig";
import DisabilitiesEnum from "../Store/Disabilities";

const SESSION_ID_KEY = "langgraph:session_id";
const DISABILITY_KEY = "disability";

export const PROBLEM_CHANGED_EVENT = "workflow:problem-changed";

function readProblemJson() {
    try {
        const raw = sessionStorage.getItem("problem_json");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

export function getSessionId() {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
}

export function resetSessionId() {
    sessionStorage.removeItem(SESSION_ID_KEY);
}

export function getSelectedDisabilityName() {
    try {
        const raw = sessionStorage.getItem(DISABILITY_KEY);
        if (!raw) return null;
        const id = JSON.parse(raw);
        return DisabilitiesEnum[id] || null;
    } catch {
        return null;
    }
}

export function persistProblem(problemData) {
    if (!problemData?.problem) {
        throw new Error("Problem data is missing required problem text");
    }

    const canonical = {
        problem: problemData.problem,
        answer: problemData.answer || "",
        solution: problemData.solution || problemData.approach || "",
        grade_level: problemData.grade_level,
        concepts: problemData.concepts || [],
        difficulty: problemData.difficulty,
        answer_validated: Boolean(problemData.answer_validated),
    };

    sessionStorage.setItem("problem", canonical.problem);
    sessionStorage.setItem("answer", canonical.answer);
    sessionStorage.setItem("approach", canonical.solution);
    try {
        sessionStorage.setItem("problem_json", JSON.stringify(canonical));
    } catch (e) {
        console.warn("Unable to persist problem_json:", e);
    }

    window.dispatchEvent(
        new CustomEvent(PROBLEM_CHANGED_EVENT, { detail: { problem: canonical } })
    );

    return canonical;
}

export function getProblemObject() {
    const problemJson = readProblemJson();
    if (problemJson?.problem) {
        return problemJson;
    }
    const text = sessionStorage.getItem("problem");
    if (!text) return null;
    return {
        problem: text,
        answer: sessionStorage.getItem("answer") || "",
        solution: sessionStorage.getItem("approach") || "",
    };
}

export function getWorkflowPayload(disability) {
    const problem = getProblemObject();
    return {
        grade_level: readStoredGradeLevel() || DEFAULT_GRADE_LEVEL,
        difficulty: readStoredDifficulty() || DEFAULT_DIFFICULTY,
        disability,
        problem,
        metadata: {
            session_id: getSessionId(),
        },
    };
}

export function getPrewarmPayload(disability) {
    const payload = getWorkflowPayload(disability);
    if (!payload.problem) return null;
    return payload;
}
