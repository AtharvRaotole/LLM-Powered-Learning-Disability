/**
 * @jest-environment jsdom
 */

import {
    persistProblem,
    getProblemObject,
    getWorkflowPayload,
    PROBLEM_CHANGED_EVENT,
} from "./workflowSession";

describe("workflowSession", () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    test("persistProblem round-trips through getProblemObject", () => {
        persistProblem({
            problem: "What is 2 + 2?",
            answer: "4",
            solution: "Add 2 and 2.\nFinal answer: 4",
            answer_validated: true,
        });

        const obj = getProblemObject();
        expect(obj.problem).toBe("What is 2 + 2?");
        expect(obj.answer).toBe("4");
        expect(obj.solution).toContain("Final answer: 4");
        expect(obj.answer_validated).toBe(true);
    });

    test("getWorkflowPayload includes persisted problem", () => {
        persistProblem({
            problem: "Test problem",
            answer: "7",
            solution: "Steps",
        });

        const payload = getWorkflowPayload("Dyslexia");
        expect(payload.problem.problem).toBe("Test problem");
        expect(payload.disability).toBe("Dyslexia");
    });

    test("persistProblem dispatches change event", () => {
        const handler = jest.fn();
        window.addEventListener(PROBLEM_CHANGED_EVENT, handler);
        persistProblem({ problem: "P", answer: "1", solution: "S" });
        expect(handler).toHaveBeenCalled();
        window.removeEventListener(PROBLEM_CHANGED_EVENT, handler);
    });
});
