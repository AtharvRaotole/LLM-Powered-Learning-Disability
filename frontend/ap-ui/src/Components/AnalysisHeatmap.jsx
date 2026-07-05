import classes from "./AnalysisHeatmap.module.css";
import { formatScore, getCheckLabel, scoreToColor, confidenceToColor } from "../Utils/workflowFormatters";

const CHECK_ORDER = [
    "step_answer_consistency",
    "disability_behavior",
    "mathematical_reasoning",
    "error_patterns",
    "completeness",
];

export default function AnalysisHeatmap({ checks, overallScore, confidenceLevel }) {
    const cells = CHECK_ORDER.map((key) => {
        const check = checks?.[key];
        const score = check?.score ?? null;
        return { key, label: getCheckLabel(key), score };
    });

    const overall = overallScore ?? null;
    const confTone = confidenceToColor(confidenceLevel);

    return (
        <div className={classes.wrapper}>
            <div className={classes.header}>
                <span className={classes.headerTitle}>Performance Snapshot</span>
                {confidenceLevel && (
                    <span className={`${classes.confidence} ${classes[confTone]}`}>
                        Confidence: {confidenceLevel}
                    </span>
                )}
            </div>

            <div className={classes.grid}>
                {cells.map(({ key, label, score }) => (
                    <div
                        key={key}
                        className={`${classes.cell} ${classes[scoreToColor(score)]}`}
                        title={score != null ? `${label}: ${formatScore(score)}` : label}
                    >
                        <span className={classes.cellLabel}>{label}</span>
                        <span className={classes.cellScore}>{formatScore(score)}</span>
                    </div>
                ))}
                <div
                    className={`${classes.cell} ${classes.overall} ${classes[scoreToColor(overall)]}`}
                    title={overall != null ? `Overall: ${formatScore(overall)}` : "Overall"}
                >
                    <span className={classes.cellLabel}>Overall</span>
                    <span className={classes.cellScore}>{formatScore(overall)}</span>
                </div>
            </div>
        </div>
    );
}
