/**
 * Converts common LaTeX/math markup from LLM output into plain readable text.
 */
export function normalizeMathText(text) {
    if (!text || typeof text !== "string") return text;

    let s = text;
    s = s.replace(/\s*—\s*/g, ", ");
    s = s.replace(/\s*–\s*/g, ", ");
    s = s.replace(/\$\$([^$]+)\$\$/g, "$1");
    s = s.replace(/\$([^$]+)\$/g, "$1");
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2");
    s = s.replace(/\\times/g, "×");
    s = s.replace(/\\div/g, "÷");
    s = s.replace(/\\cdot/g, "·");
    s = s.replace(/\\pm/g, "±");
    s = s.replace(/\\leq/g, "≤");
    s = s.replace(/\\geq/g, "≥");
    s = s.replace(/\\neq/g, "≠");
    s = s.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");
    s = s.replace(/\\left|\\right/g, "");
    s = s.replace(/\\,/g, " ");
    s = s.replace(/\\\\/g, "\n");
    s = s.replace(/\\text\{([^}]+)\}/g, "$1");
    s = s.replace(/\\[a-zA-Z]+/g, "");
    s = s.replace(/\{([^{}]+)\}/g, "$1");
    return s.replace(/[ \t]+\n/g, "\n").trim();
}
