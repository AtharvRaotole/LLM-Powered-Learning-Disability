import { normalizeMathText } from "./chatMessageFormat";

describe("normalizeMathText", () => {
    it("converts LaTeX fractions to plain text", () => {
        expect(normalizeMathText("$$ \\frac{1}{4} $$")).toBe("1/4");
        expect(normalizeMathText("\\frac{3}{8}")).toBe("3/8");
    });

    it("strips dollar sign wrappers", () => {
        expect(normalizeMathText("$x + 2$")).toBe("x + 2");
    });

    it("replaces em dashes with commas", () => {
        expect(normalizeMathText("strategies — I'm here")).toBe("strategies, I'm here");
    });

    it("replaces common math symbols", () => {
        expect(normalizeMathText("2 \\times 3")).toBe("2 × 3");
        expect(normalizeMathText("6 \\div 2")).toBe("6 ÷ 2");
    });
});
