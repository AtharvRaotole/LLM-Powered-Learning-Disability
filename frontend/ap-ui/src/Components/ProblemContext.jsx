import classes from './ProblemContext.module.css';
import { getDifficultyLabel, getGradeLabel, readStoredDifficulty, readStoredGradeLevel } from '../Utils/gradeConfig';
import { getProblemObject } from '../Utils/workflowSession';

export default function ProblemContext() {
    const problemObj = getProblemObject();
    const problem = problemObj?.problem;
    const gradeLevel = getGradeLabel(readStoredGradeLevel());
    const difficulty = getDifficultyLabel(readStoredDifficulty());
    const answer = problemObj?.answer || 'NA';

    if (!problem) {
        return null;
    }

    return (
        <div className={classes.problemContextContainer}>
            <div className={classes.problemHeader}>
                <span className={classes.problemTitle}>Current Problem</span>
            </div>
            <div className={classes.problemContent}>
                {problem}
            </div>
            <div className={classes.problemMeta}>
                <span className={classes.metaBadge}>
                    <span className={classes.metaLabel}>Grade:</span> {gradeLevel}
                </span>
                <span className={classes.metaBadge}>
                    <span className={classes.metaLabel}>Difficulty:</span> {difficulty}
                </span>
                <span className={classes.metaBadge}>
                    <span className={classes.metaLabel}>Correct answer:</span> {answer}
                </span>
            </div>
        </div>
    );
}
