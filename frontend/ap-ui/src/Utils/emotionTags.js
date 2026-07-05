const NEGATIVE_EMOTIONS = new Set([
    "frustrated",
    "confused",
    "anxious",
    "discouraged",
    "overwhelmed",
    "stuck",
]);

const POSITIVE_EMOTIONS = new Set([
    "hopeful",
    "relieved",
    "proud",
    "engaged",
    "confident",
    "excited",
]);

const NEUTRAL_EMOTIONS = new Set([
    "curious",
    "hesitant",
    "uncertain",
    "thoughtful",
]);

const TUTOR_TONES = new Set([
    "encouraging",
    "empathetic",
    "patient",
    "celebratory",
    "reassuring",
    "curious",
    "supportive",
]);

export function normalizeLabel(raw) {
    if (!raw || typeof raw !== "string") return "";
    return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function getEmotionStyle(label, speaker = "Student") {
    const normalized = normalizeLabel(label);
    if (!normalized) return "neutral";

    if (speaker === "Tutor" || TUTOR_TONES.has(normalized)) {
        return "tutor";
    }
    if (NEGATIVE_EMOTIONS.has(normalized)) return "negative";
    if (POSITIVE_EMOTIONS.has(normalized)) return "positive";
    if (NEUTRAL_EMOTIONS.has(normalized)) return "neutral";
    return "neutral";
}

export function getTurnLabel(turn) {
    if (!turn) return "";
    if (turn.speaker === "Tutor") {
        return normalizeLabel(turn.tone);
    }
    return normalizeLabel(turn.emotion);
}
