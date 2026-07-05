export const GRADE_LEVELS = [
    { value: "childhood", label: "Early Childhood" },
    { value: "kindergarten", label: "Kindergarten" },
    { value: "1st", label: "1st Grade" },
    { value: "2nd", label: "2nd Grade" },
    { value: "3rd", label: "3rd Grade" },
    { value: "4th", label: "4th Grade" },
    { value: "5th", label: "5th Grade" },
    { value: "6th", label: "6th Grade" },
    { value: "7th", label: "7th Grade" },
    { value: "8th", label: "8th Grade" },
];

export const DIFFICULTY_LEVELS = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
];

export const DEFAULT_GRADE_LEVEL = "5th";
export const DEFAULT_DIFFICULTY = "medium";

const GRADE_ALIASES = {
    "early childhood": "childhood",
    "pre-k": "childhood",
    prek: "childhood",
    k: "kindergarten",
    kg: "kindergarten",
};

const DIFFICULTY_ALIASES = {
    beginner: "easy",
    intermediate: "medium",
    advanced: "hard",
    expert: "hard",
    difficult: "hard",
};

export function normalizeGradeLevel(value) {
    if (!value) return DEFAULT_GRADE_LEVEL;
    const stripped = String(value).trim().toLowerCase();
    if (GRADE_ALIASES[stripped]) return GRADE_ALIASES[stripped];
    const byValue = GRADE_LEVELS.find((g) => g.value.toLowerCase() === stripped);
    if (byValue) return byValue.value;
    const byLabel = GRADE_LEVELS.find((g) => g.label.toLowerCase() === stripped);
    if (byLabel) return byLabel.value;
    return DEFAULT_GRADE_LEVEL;
}

export function normalizeDifficulty(value) {
    if (!value) return DEFAULT_DIFFICULTY;
    const stripped = String(value).trim().toLowerCase();
    if (DIFFICULTY_ALIASES[stripped]) return DIFFICULTY_ALIASES[stripped];
    const byValue = DIFFICULTY_LEVELS.find((d) => d.value === stripped);
    if (byValue) return byValue.value;
    const byLabel = DIFFICULTY_LEVELS.find((d) => d.label.toLowerCase() === stripped);
    if (byLabel) return byLabel.value;
    return DEFAULT_DIFFICULTY;
}

export function getGradeLabel(value) {
    const normalized = normalizeGradeLevel(value);
    return GRADE_LEVELS.find((g) => g.value === normalized)?.label || normalized;
}

export function getDifficultyLabel(value) {
    const normalized = normalizeDifficulty(value);
    return DIFFICULTY_LEVELS.find((d) => d.value === normalized)?.label || normalized;
}

export function readStoredGradeLevel() {
    return normalizeGradeLevel(sessionStorage.getItem("gradeLevel"));
}

export function readStoredDifficulty() {
    return normalizeDifficulty(sessionStorage.getItem("difficulty"));
}

export function persistGradeAndDifficulty(gradeLevel, difficulty) {
    const grade = normalizeGradeLevel(gradeLevel);
    const diff = normalizeDifficulty(difficulty);
    sessionStorage.setItem("gradeLevel", grade);
    sessionStorage.setItem("difficulty", diff);
    return { gradeLevel: grade, difficulty: diff };
}
