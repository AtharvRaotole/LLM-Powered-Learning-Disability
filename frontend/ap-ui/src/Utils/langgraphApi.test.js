import { clearWorkflowCache } from "./langgraphApi";

describe("langgraphApi cache keys", () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    test("clearWorkflowCache removes indexed entries", async () => {
        sessionStorage.setItem("langgraph:full:index", JSON.stringify(["langgraph:full:test"]));
        sessionStorage.setItem(
            "langgraph:full:test",
            JSON.stringify({ data: { ok: true }, expires_at: Date.now() + 60000 })
        );
        clearWorkflowCache();
        expect(sessionStorage.getItem("langgraph:full:test")).toBeNull();
        expect(sessionStorage.getItem("langgraph:full:index")).toBeNull();
    });
});
