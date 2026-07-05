import {
    GRADE_LEVELS,
    DIFFICULTY_LEVELS,
} from "../Utils/gradeConfig";
import classes from "./GradeDifficultyControls.module.css";

export default function GradeDifficultyControls({
    gradeLevel,
    difficulty,
    onGradeChange,
    onDifficultyChange,
    compact = false,
}) {
    return (
        <div className={`${classes.controls} ${compact ? classes.compact : ""}`}>
            <div className={classes.controlRow}>
                <label htmlFor="gradeLevelSelect" className={classes.label}>
                    Grade
                </label>
                <div className={classes.selectWrapper}>
                    <select
                        id="gradeLevelSelect"
                        className={classes.select}
                        value={gradeLevel}
                        onChange={(e) => onGradeChange(e.target.value)}
                        aria-label="Select grade level"
                    >
                        {GRADE_LEVELS.map((grade) => (
                            <option key={grade.value} value={grade.value}>
                                {grade.label}
                            </option>
                        ))}
                    </select>
                    <span className={classes.chevron} aria-hidden="true">›</span>
                </div>
            </div>

            <div className={classes.controlRow}>
                <span className={classes.label}>Difficulty</span>
                <div className={classes.segmented} role="group" aria-label="Select difficulty">
                    {DIFFICULTY_LEVELS.map((level) => (
                        <button
                            key={level.value}
                            type="button"
                            className={`${classes.segment} ${difficulty === level.value ? classes.segmentActive : ""}`}
                            onClick={() => onDifficultyChange(level.value)}
                            aria-pressed={difficulty === level.value}
                        >
                            {level.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
