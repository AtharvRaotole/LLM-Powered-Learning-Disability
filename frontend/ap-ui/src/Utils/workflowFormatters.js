const CHECK_LABELS = {
    step_answer_consistency: "Answer Matches Steps",
    disability_behavior: "Disability Profile",
    mathematical_reasoning: "Math Reasoning",
    error_patterns: "Error Patterns",
    completeness: "Completeness",
};

export function getCheckLabel(key) {
    return CHECK_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scoreToColor(score) {
    if (score == null || Number.isNaN(score)) return "neutral";
    if (score >= 0.7) return "good";
    if (score >= 0.5) return "warn";
    return "bad";
}

export function formatScore(score) {
    if (score == null || Number.isNaN(score)) return "N/A";
    return `${Math.round(score * 100)}%`;
}

export function textToBullets(text, maxItems = 4) {
    if (!text) return [];
    if (Array.isArray(text)) {
        return text.filter(Boolean).slice(0, maxItems);
    }
    const str = String(text).trim();
    if (!str) return [];

    const byNewline = str.split(/\n+/).map((s) => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
    if (byNewline.length > 1) return byNewline.slice(0, maxItems);

    const bySentence = str.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (bySentence.length > 1) return bySentence.slice(0, maxItems);

    return [str];
}

function normalizeImplementation(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") return textToBullets(value, 8);
    return [];
}

function normalizeStrategyItem(item) {
    if (typeof item === "string") {
        return { name: item, description: "", rationale: "", implementation: [] };
    }
    return {
        name: item.name || item.title || "Strategy",
        description: item.description || "",
        rationale: item.rationale || "",
        implementation: normalizeImplementation(item.implementation),
    };
}

function normalizeAlternative(item) {
    if (typeof item === "string") {
        return { name: item, description: "", whenToUse: "" };
    }
    return {
        name: item.name || item.title || "Alternative",
        description: item.description || "",
        whenToUse: item.when_to_use || item.whenToUse || "",
    };
}

export function normalizeTeachingStrategies(raw) {
    if (!raw || typeof raw !== "object") {
        return { primary: [], alternatives: [], scaffolding: [], accommodations: [], assessments: [] };
    }

    const primary = (raw.primary_strategies || raw.immediate_strategies || []).map(normalizeStrategyItem);

    const alternatives = (raw.alternative_approaches || raw.multi_sensory_approaches || []).map((item) => {
        if (typeof item === "string") {
            return { name: item, description: "", whenToUse: "" };
        }
        return normalizeAlternative(item);
    });

    const scaffolding = (raw.scaffolding_sequence || []).filter(Boolean);
    const accommodations = (raw.accommodations || []).filter(Boolean);
    const assessments = (raw.assessment_methods || raw.assessment_modifications || []).filter(Boolean);

    const legacyTools = raw.technology_tools || [];
    legacyTools.forEach((tool) => {
        if (typeof tool === "string") {
            accommodations.push(tool);
        }
    });

    if (raw.parent_communication && typeof raw.parent_communication === "string") {
        primary.push({
            name: "Parent Communication",
            description: raw.parent_communication,
            rationale: "",
            implementation: [],
        });
    }

    return { primary, alternatives, scaffolding, accommodations, assessments };
}

function parseNumericLike(value) {
    if (value == null) return null;
    const str = String(value).trim();
    const frac = str.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (frac) {
        const den = parseFloat(frac[2]);
        if (den !== 0) return parseFloat(frac[1]) / den;
    }
    if (str.endsWith("%")) {
        const n = parseFloat(str.replace(/[^0-9.-]/g, ""));
        if (!Number.isNaN(n)) return n / 100;
    }
    const n = parseFloat(str);
    if (!Number.isNaN(n)) return n;
    const nums = str.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (nums?.length) {
        const last = parseFloat(nums[nums.length - 1]);
        if (!Number.isNaN(last)) return last;
    }
    return null;
}

export function compareAnswers(studentAnswer, correctAnswer) {
    if (!studentAnswer || !correctAnswer || correctAnswer === "NA") {
        return { status: "unknown", label: "Not compared" };
    }
    const student = parseNumericLike(studentAnswer);
    const correct = parseNumericLike(correctAnswer);
    if (student != null && correct != null) {
        const diff = Math.abs(student - correct);
        const tolerance = Math.max(Math.abs(correct) * 0.01, 0.001);
        if (diff <= tolerance) return { status: "correct", label: "Correct" };
        return { status: "incorrect", label: "Incorrect" };
    }
    const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
    if (norm(studentAnswer) === norm(correctAnswer)) {
        return { status: "correct", label: "Correct" };
    }
    return { status: "incorrect", label: "Incorrect" };
}

export function confidenceToColor(level) {
    const l = String(level || "").toLowerCase();
    if (l === "high") return "good";
    if (l === "medium") return "warn";
    if (l === "low") return "bad";
    return "neutral";
}

export function stripJsonFences(text) {
    if (!text || typeof text !== "string") return text;
    return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function parseJsonField(value) {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(stripJsonFences(value));
    } catch {
        return { raw: value };
    }
}

function stripMarkdownBold(text) {
    return String(text || "").replace(/\*\*/g, "").trim();
}

function parseHintAndQuestion(text) {
    let body = String(text || "").trim();

    const hintMatch = body.match(/\(Hint:\s*(.+?)\)/i);
    const hint = hintMatch?.[1]?.trim() || "";
    if (hintMatch) body = body.replace(hintMatch[0], "").trim();

    body = body.replace(/\s+\d+\.\s*$/g, "").trim();
    body = body.replace(/^\d+[.)]\s+/, "").trim();

    return { question: body, hint };
}

function finalizeProblem(problem) {
    const questionText = [problem.question, problem.hint ? `(Hint: ${problem.hint})` : ""]
        .filter(Boolean)
        .join(" ");
    const parsed = parseHintAndQuestion(questionText);
    return {
        ...problem,
        question: parsed.question,
        hint: parsed.hint || problem.hint,
    };
}

function extractInlineProblems(text) {
    const cleaned = stripMarkdownBold(text);
    const regex = /Problem\s+(\d+)\s*:\s*/gi;
    const matches = [...cleaned.matchAll(regex)];
    if (!matches.length) return [];

    return matches.map((match, i) => {
        const start = match.index + match[0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : cleaned.length;
        const body = cleaned.slice(start, end).trim();
        const parsed = parseHintAndQuestion(body);

        return finalizeProblem({
            number: parseInt(match[1], 10),
            title: `Problem ${match[1]}`,
            question: parsed.question,
            hint: parsed.hint,
        });
    });
}

function normalizeStructuredProblems(raw) {
    if (!Array.isArray(raw) || !raw.length) return null;
    const structured = raw.filter((item) => item && typeof item === "object" && item.question);
    if (!structured.length) return null;

    return {
        intro: "",
        problems: structured.map((item, i) => {
            const parsed = parseHintAndQuestion(item.question);
            return finalizeProblem({
                number: i + 1,
                title: `Problem ${i + 1}`,
                question: parsed.question,
                hint: parsed.hint || String(item.hint || "").trim(),
            });
        }),
    };
}

export function normalizePracticeProblems(raw) {
    const structured = normalizeStructuredProblems(raw);
    if (structured) return structured;

    const lines = Array.isArray(raw)
        ? raw.map((p) => (typeof p === "object" ? "" : stripMarkdownBold(p))).filter(Boolean)
        : String(raw || "")
              .split(/\n+/)
              .map((s) => stripMarkdownBold(s))
              .filter(Boolean);

    if (!lines.length) return { intro: "", problems: [] };

    const intro = lines.find((l) => /^here are/i.test(l)) || "";
    const contentLines = lines.filter((l) => l !== intro);
    const fullText = contentLines.join("\n");

    const inlineProblems = extractInlineProblems(fullText);
    if (inlineProblems.length > 0) {
        return { intro, problems: inlineProblems };
    }

    const problems = [];
    let current = null;

    for (const line of contentLines) {
        const problemMatch = line.match(/^Problem\s+(\d+)\s*:?\s*(.*)$/i);
        const hintMatch = line.match(/^\(Hint:\s*(.+?)\)\s*$/i);

        if (problemMatch) {
            if (current) problems.push(current);
            const rest = problemMatch[2]?.trim();
            current = {
                number: parseInt(problemMatch[1], 10),
                title: `Problem ${problemMatch[1]}`,
                question: rest || "",
                hint: "",
            };
            continue;
        }

        if (hintMatch) {
            if (current) current.hint = hintMatch[1];
            continue;
        }

        if (current) {
            const cleaned = line.replace(/^\d+[.)]\s*/, "").trim();
            current.question = current.question
                ? `${current.question} ${cleaned}`
                : cleaned;
            continue;
        }

        const numbered = line.match(/^\d+[.)]\s+(.+)$/);
        if (numbered) {
            const parsed = parseHintAndQuestion(numbered[1]);
            problems.push(finalizeProblem({
                number: problems.length + 1,
                title: `Problem ${problems.length + 1}`,
                question: parsed.question,
                hint: parsed.hint,
            }));
        }
    }

    if (current) problems.push(finalizeProblem(current));

    if (!problems.length) {
        const fallback = contentLines
            .map((l) => l.replace(/^\d+[.)]\s*/, "").trim())
            .filter(Boolean);

        return {
            intro,
            problems: fallback.map((q, i) => {
                const parsed = parseHintAndQuestion(q);
                return finalizeProblem({
                    number: i + 1,
                    title: `Problem ${i + 1}`,
                    question: parsed.question,
                    hint: parsed.hint,
                });
            }),
        };
    }

    return { intro, problems: problems.map(finalizeProblem) };
}

export function classifyImprovementBullet(text) {
    const lower = String(text || "").toLowerCase();
    if (/\b(however|still|confus|struggle|difficult|challenge|need|remain|issue|uncertain)\b/.test(lower)) {
        return "watch";
    }
    if (/\b(improv|better|engag|confiden|proactive|growing|strength|progress|demonstrat)\b/.test(lower)) {
        return "win";
    }
    return "neutral";
}
