import { getEmotionStyle, normalizeLabel } from "../Utils/emotionTags";
import classes from "./EmotionBadge.module.css";

export default function EmotionBadge({ label, speaker = "Student" }) {
    const normalized = normalizeLabel(label);
    if (!normalized) return null;

    const variant = getEmotionStyle(normalized, speaker);

    return (
        <span className={`${classes.badge} ${classes[variant]}`}>
            [{normalized}]
        </span>
    );
}
