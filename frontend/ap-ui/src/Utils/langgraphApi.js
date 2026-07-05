import { getSessionId, resetSessionId, getProblemObject } from "./workflowSession";
import { DEFAULT_DIFFICULTY, DEFAULT_GRADE_LEVEL, normalizeDifficulty, normalizeGradeLevel } from "./gradeConfig";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
const CACHE_TTL_MS = 60 * 60 * 1000;

const ANALYSIS_PREFIX = "langgraph:analysis:";
const ANALYSIS_INDEX_KEY = `${ANALYSIS_PREFIX}index`;
const FULL_PREFIX = "langgraph:full:";
const FULL_INDEX_KEY = `${FULL_PREFIX}index`;

async function sha256Hex(value) {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    const data = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function canonicalStringify(obj) {
    if (obj === null || typeof obj !== "object") {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map(canonicalStringify).join(",")}]`;
    }
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(",")}}`;
}

async function hashPayload(value) {
    if (!value) return "0";
    return (await sha256Hex(canonicalStringify(value))).slice(0, 16);
}

function loadIndex(indexKey) {
    try {
        const existing = sessionStorage.getItem(indexKey);
        return existing ? JSON.parse(existing) : [];
    } catch {
        return [];
    }
}

function storeIndex(indexKey, keys) {
    try {
        sessionStorage.setItem(indexKey, JSON.stringify(keys));
    } catch (err) {
        console.warn("Unable to persist LangGraph cache index", err);
    }
}

function updateIndex(indexKey, key) {
    const keys = loadIndex(indexKey);
    if (!keys.includes(key)) {
        keys.push(key);
        storeIndex(indexKey, keys);
    }
}

function clearIndexedCache(indexKey) {
    const keys = loadIndex(indexKey);
    keys.forEach((key) => sessionStorage.removeItem(key));
    sessionStorage.removeItem(indexKey);
}

export function clearAnalysisCache() {
    clearIndexedCache(ANALYSIS_INDEX_KEY);
}

function clearFullCache() {
    clearIndexedCache(FULL_INDEX_KEY);
}

export function clearWorkflowCache() {
    clearAnalysisCache();
    clearFullCache();
}

async function postJson(path, payload) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text();
        let message = text || `Request failed with status ${response.status}`;
        try {
            const parsed = JSON.parse(text);
            if (parsed?.detail) {
                message = typeof parsed.detail === "string"
                    ? parsed.detail
                    : JSON.stringify(parsed.detail);
            }
        } catch {
            // keep raw text
        }
        throw new Error(message);
    }
    return response.json();
}

async function getJson(path) {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
    }
    return response.json();
}

function readCachedEntry(key) {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed.expires_at && Date.now() > parsed.expires_at) {
            sessionStorage.removeItem(key);
            return null;
        }
        return parsed.data ?? parsed;
    } catch {
        sessionStorage.removeItem(key);
        return null;
    }
}

function storeCacheEntry(indexKey, key, value, lastKeyName) {
    try {
        const wrapped = {
            data: value,
            expires_at: Date.now() + CACHE_TTL_MS,
        };
        sessionStorage.setItem(key, JSON.stringify(wrapped));
        updateIndex(indexKey, key);
        if (lastKeyName) {
            sessionStorage.setItem(lastKeyName, key);
        }
    } catch (err) {
        console.warn("Unable to cache LangGraph response", err);
    }
}

export async function buildFullKey(payload) {
    const grade = normalizeGradeLevel(payload.grade_level || DEFAULT_GRADE_LEVEL);
    const difficulty = normalizeDifficulty(payload.difficulty || DEFAULT_DIFFICULTY);
    const disability = payload.disability || "No disability";
    const problemHash = await hashPayload(payload.problem || payload.workflow_key || "");
    return `${FULL_PREFIX}${grade}|${difficulty}|${disability}|${problemHash}`;
}

async function buildAnalysisKey(payload, workflowType) {
    const grade = normalizeGradeLevel(payload.grade_level || DEFAULT_GRADE_LEVEL);
    const difficulty = normalizeDifficulty(payload.difficulty || DEFAULT_DIFFICULTY);
    const disability = payload.disability || "No disability";
    const problemHash = await hashPayload(payload.problem || payload.workflow_key || "");
    const attemptHash = await hashPayload(payload.student_attempt || "");
    const responseHash = await hashPayload(payload.student_response || "");
    return `${ANALYSIS_PREFIX}${workflowType}|${grade}|${difficulty}|${disability}|${problemHash}|${attemptHash}|${responseHash}`;
}

export async function generateLangGraphProblem({ grade_level, difficulty, disability }) {
    clearWorkflowCache();
    resetSessionId();
    await invalidateServerWorkflowCache();
    const payload = {
        grade_level: normalizeGradeLevel(grade_level),
        difficulty: normalizeDifficulty(difficulty),
        metadata: { refresh_problem: true, session_id: getSessionId() },
    };
    if (disability) {
        payload.disability = disability;
    }
    const data = await postJson("/api/v2/langgraph/generate-problem", payload);
    const problem =
        data?.results?.generated_problem ||
        data?.generated_problem ||
        data;
    if (problem && typeof problem === "object") {
        problem.answer_validated = Boolean(
            problem.answer_validated ?? data?.metadata?.answer_validated
        );
    }
    return problem;
}

export async function invalidateServerWorkflowCache(sessionId) {
    try {
        await postJson("/api/v2/langgraph/cache-invalidate", {
            session_id: sessionId || getSessionId(),
        });
    } catch (err) {
        console.warn("Server cache invalidation failed:", err);
    }
}

export async function sendChatMessage({
    message,
    chat_mode = "tutor",
    personality = "helpful",
    conversation_history = [],
    problem_context,
}) {
    const payload = {
        message,
        chat_mode,
        personality,
        conversation_history,
    };
    const problemObj = problem_context || getProblemObject();
    if (problemObj?.problem) {
        payload.problem_context = {
            problem: problemObj.problem,
            answer: problemObj.answer,
        };
    }
    return postJson("/api/v1/openai/chat", payload);
}

export async function triggerPrewarm(payload) {
    return postJson("/api/v2/langgraph/prewarm", { ...payload, workflow_type: "full" });
}

export async function getPrewarmStatus(sessionKey) {
    return getJson(`/api/v2/langgraph/prewarm-status/${encodeURIComponent(sessionKey)}`);
}

export async function runLangGraphWorkflow(payload) {
    return postJson("/api/v2/langgraph/workflow", payload);
}

export async function runLangGraphFull(payload) {
    return postJson("/api/v2/langgraph/full-workflow", payload);
}

export async function runBatchSimulate(payload) {
    return postJson("/api/v2/langgraph/batch-simulate", payload);
}

export async function runImprovementFlow(payload) {
    return postJson("/api/v2/langgraph/improvement_analysis", payload);
}

export async function startDisabilityAssessment({ grade_level, difficulty }) {
    return postJson("/api/v2/langgraph/disability-assessment/start", {
        grade_level,
        difficulty,
    });
}

export async function evaluateDisabilityAssessment({ grade_level, difficulty, rounds, round_number }) {
    return postJson("/api/v2/langgraph/disability-assessment/evaluate", {
        grade_level,
        difficulty,
        rounds,
        round_number,
    });
}

export async function getOrRunAnalysis(payload, options = {}) {
    const workflowType = options.workflow_type || "analysis_only";
    const forceRefresh = options.forceRefresh || false;
    const key = await buildAnalysisKey(payload, workflowType);

    if (!forceRefresh) {
        const cached = readCachedEntry(key);
        if (cached) return cached;
    }

    const response = await runLangGraphWorkflow({ ...payload, workflow_type: workflowType });
    storeCacheEntry(ANALYSIS_INDEX_KEY, key, response, `${ANALYSIS_PREFIX}last`);
    return response;
}

export function getCachedAnalysis(payload, options = {}) {
    const workflowType = options.workflow_type || "analysis_only";
    return buildAnalysisKey(payload, workflowType).then((key) => readCachedEntry(key));
}

export async function getOrRunFullWorkflow(payload, options = {}) {
    const forceRefresh = options.forceRefresh || false;
    const key = await buildFullKey(payload);

    if (!forceRefresh) {
        const cached = readCachedEntry(key);
        if (cached) {
            if (process.env.REACT_APP_DEBUG_CACHE === "true") {
                console.debug("[cache hit] full workflow", key);
            }
            return cached;
        }
    }

    if (process.env.REACT_APP_DEBUG_CACHE === "true") {
        console.debug("[cache miss] full workflow", key);
    }

    const response = await runLangGraphFull({ ...payload, workflow_type: "full" });
    storeCacheEntry(FULL_INDEX_KEY, key, response, `${FULL_PREFIX}last`);
    return response;
}

export async function getOrRunImprovementAnalysis(improvementKey, payload) {
    const cached = readCachedEntry(improvementKey);
    if (cached) return cached;

    const response = await runImprovementFlow(payload);
    try {
        const wrapped = {
            data: response,
            expires_at: Date.now() + CACHE_TTL_MS,
        };
        sessionStorage.setItem(improvementKey, JSON.stringify(wrapped));
    } catch (err) {
        console.warn("Unable to cache improvement analysis", err);
    }
    return response;
}

export async function fetchCacheStats() {
    return getJson("/api/v2/langgraph/cache-stats");
}
