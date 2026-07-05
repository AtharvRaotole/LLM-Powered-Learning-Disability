import classes from "./Attempt.module.css";
import ProblemContext from "./ProblemContext";
import WorkflowTabShell from "./WorkflowTabShell";
import { useWorkflow, ConsistencyBadge } from "../Context/WorkflowProvider";
import { compareAnswers } from "../Utils/workflowFormatters";
import { getProblemObject } from "../Utils/workflowSession";

export default function Attempt() {
    const { results, isLoading, error, metadata } = useWorkflow();
    const response = results?.student_simulation;
    const consistencyScore = metadata?.consistency_score ?? results?.consistency_validation?.overall_consistency_score;
    const displayAnswer = response?.final_answer || response?.studentAnswer;
    const correctAnswer = getProblemObject()?.answer || "NA";
    const answerStatus = compareAnswers(displayAnswer, correctAnswer);

    return (
        <>
            <ProblemContext />
            <WorkflowTabShell
                title="Student Simulation"
                subtitle="How a student with this disability would approach this problem"
                headerExtra={<ConsistencyBadge score={consistencyScore} />}
                isLoading={isLoading}
                loadingMessage="Simulating student's approach..."
                error={error}
            >
                {response && (
                    <>
                        {displayAnswer && (
                            <div className={classes.answerCard}>
                                <div className={classes.answerHeader}>
                                    <span className={classes.sectionLabel}>Answer Comparison</span>
                                    <span className={`${classes.statusPill} ${classes[answerStatus.status]}`}>
                                        {answerStatus.label}
                                    </span>
                                </div>
                                <div className={classes.answerGrid}>
                                    <div className={classes.answerBlock}>
                                        <span className={classes.answerLabel}>Student's Answer</span>
                                        <span className={classes.answerValue}>{displayAnswer}</span>
                                    </div>
                                    <div className={classes.answerBlock}>
                                        <span className={classes.answerLabel}>Correct Answer</span>
                                        <span className={classes.answerValueMuted}>{correctAnswer}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {response.thoughtprocess && (
                            <div className={classes.thoughtBlock}>
                                <span className={classes.sectionLabel}>Internal Thoughts</span>
                                <blockquote className={classes.thoughtQuote}>
                                    {response.thoughtprocess}
                                </blockquote>
                            </div>
                        )}

                        {response.steps_to_solve?.length > 0 && (
                            <div className={classes.timeline}>
                                <span className={classes.sectionLabel}>Step-by-Step Solution</span>
                                <ol className={classes.timelineList}>
                                    {response.steps_to_solve.map((step, index) => {
                                        const isLast = index === response.steps_to_solve.length - 1;
                                        return (
                                            <li
                                                key={index}
                                                className={`${classes.timelineItem} ${isLast ? classes.timelineItemFinal : ""}`}
                                            >
                                                <span className={classes.timelineMarker}>{index + 1}</span>
                                                <div className={classes.timelineContent}>
                                                    {isLast && (
                                                        <span className={classes.finalStepTag}>Final step</span>
                                                    )}
                                                    <p>{step}</p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        )}

                        {response.disability_impact && (
                            <div className={classes.callout}>
                                <span className={classes.sectionLabel}>Disability Impact</span>
                                <p>{response.disability_impact}</p>
                            </div>
                        )}
                    </>
                )}
            </WorkflowTabShell>
        </>
    );
}
