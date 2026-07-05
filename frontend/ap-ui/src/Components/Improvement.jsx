import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { buildFullKey, getOrRunImprovementAnalysis } from "../Utils/langgraphApi";
import { useWorkflow } from "../Context/WorkflowProvider";
import { getWorkflowPayload, getProblemObject } from "../Utils/workflowSession";
import DisabilitiesEnum from "../Store/Disabilities";
import {
    parseJsonField,
    textToBullets,
    normalizePracticeProblems,
    classifyImprovementBullet,
} from "../Utils/workflowFormatters";
import ProblemContext from "./ProblemContext";
import WorkflowTabShell from "./WorkflowTabShell";
import classes from "./Improvement.module.css";

function AttemptPanel({ variant, title, problem, attempt }) {
    if (!attempt && !problem) return null;
    const steps = attempt?.steps_to_solve || attempt?.steps || [];
    const thoughts = attempt?.thoughtprocess || attempt?.thoughts;
    const answer = attempt?.final_answer || attempt?.studentAnswer;

    return (
        <div className={`${classes.panel} ${classes[variant]}`}>
            <div className={classes.panelHeader}>
                <span className={classes.panelBadge}>{variant === "before" ? "Before" : "After"}</span>
                <h4 className={classes.panelTitle}>{title}</h4>
            </div>

            {problem && (
                <div className={classes.problemBlock}>
                    <span className={classes.blockLabel}>Problem</span>
                    <p className={classes.problemText}>{problem}</p>
                </div>
            )}

            {answer && (
                <div className={classes.answerBlock}>
                    <span className={classes.blockLabel}>Answer</span>
                    <span className={classes.answerValue}>{answer}</span>
                </div>
            )}

            {thoughts && (
                <div className={classes.thoughtBlock}>
                    <span className={classes.blockLabel}>
                        {variant === "before" ? "Student's thinking" : "How they worked it out"}
                    </span>
                    <p className={classes.thoughtText}>{thoughts}</p>
                </div>
            )}

            {steps.length > 0 && (
                <div className={classes.stepsBlock}>
                    <span className={classes.blockLabel}>Steps</span>
                    <ol className={classes.stepList}>
                        {steps.map((step, i) => (
                            <li key={i}>
                                <span className={classes.stepNum}>{i + 1}</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}

function PracticeCard({ problem }) {
    const [showHint, setShowHint] = useState(false);

    return (
        <article className={classes.practiceCard}>
            <div className={classes.practiceCardHeader}>
                <span className={classes.practiceNumber}>{problem.number}</span>
                <h4 className={classes.practiceTitle}>{problem.title}</h4>
            </div>
            <p className={classes.practiceQuestion}>{problem.question}</p>
            {problem.hint && (
                <div className={classes.hintArea}>
                    <button
                        type="button"
                        className={classes.hintToggle}
                        onClick={() => setShowHint(!showHint)}
                        aria-expanded={showHint}
                    >
                        <span className={classes.hintIcon}>💡</span>
                        {showHint ? "Hide hint" : "Need a hint?"}
                    </button>
                    {showHint && <p className={classes.hintText}>{problem.hint}</p>}
                </div>
            )}
        </article>
    );
}

function ImprovementWin({ text, tone }) {
    const icon = tone === "win" ? "✓" : tone === "watch" ? "!" : "•";
    return (
        <div className={`${classes.winCard} ${classes[tone]}`}>
            <span className={classes.winIcon} aria-hidden="true">{icon}</span>
            <p>{text}</p>
        </div>
    );
}

export default function Improvement() {
    const { id } = useParams();
    const disability = DisabilitiesEnum[id];
    const { workflow, isLoading: workflowLoading, error: workflowError, results } = useWorkflow();
    const [response, setResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const originalAttempt = results?.student_simulation;
    const originalProblem = getProblemObject()?.problem;

    useEffect(() => {
        let cancelled = false;

        async function loadImprovement() {
            if (workflowLoading) return;

            if (!workflow) {
                setIsLoading(false);
                setError(workflowError || "Complete earlier tabs first.");
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const payload = getWorkflowPayload(disability);
                const baseKey = await buildFullKey(payload);
                const improvementKey = `${baseKey}|improvement`;

                const improvement = await getOrRunImprovementAnalysis(improvementKey, {
                    past_attempts: JSON.stringify({
                        student_simulation: workflow.results?.student_simulation,
                        thought_analysis: workflow.results?.thought_analysis,
                        teaching_strategies: workflow.results?.teaching_strategies,
                        metadata: workflow.metadata,
                    }),
                });

                if (cancelled) return;

                const generated = parseJsonField(improvement.generated_problem);
                const studentAttempt = parseJsonField(improvement.student_attempt);
                const steps = studentAttempt?.steps_to_solve || studentAttempt?.steps || [];

                setResponse({
                    summary: improvement.summary,
                    new_problem: generated?.problem || improvement.generated_problem,
                    improvement_analysis: improvement.improvement_analysis,
                    student_attempt: {
                        ...studentAttempt,
                        steps,
                        thoughtprocess: studentAttempt?.thoughtprocess || studentAttempt?.thoughts,
                    },
                    practice_problems: improvement.practice_problems || [],
                });
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || "Error while generating improvement analysis.");
                    console.error("Improvement error:", err);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        loadImprovement();
        return () => { cancelled = true; };
    }, [workflow, workflowLoading, workflowError, disability]);

    const summaryHighlights = textToBullets(response?.summary, 3);
    const improvementBullets = textToBullets(response?.improvement_analysis, 6);
    const { intro: practiceIntro, problems: practiceProblems } = normalizePracticeProblems(
        response?.practice_problems
    );

    return (
        <>
            <ProblemContext />
            <WorkflowTabShell
                title="Improvement"
                subtitle="See how the student might improve on a similar problem"
                isLoading={isLoading || workflowLoading}
                loadingMessage="Analyzing improvement..."
                error={error}
            >
                {response && (
                    <>
                        {response.summary && (
                            <section className={classes.summaryHero}>
                                <div className={classes.summaryHeader}>
                                    <span className={classes.summaryEmoji} aria-hidden="true">📈</span>
                                    <div>
                                        <h3 className={classes.summaryTitle}>Progress Summary</h3>
                                        <p className={classes.summarySubtitle}>
                                            Where the student stands and what to focus on next
                                        </p>
                                    </div>
                                </div>
                                {summaryHighlights.length > 1 && (
                                    <div className={classes.highlightRow}>
                                        {summaryHighlights.map((item, i) => (
                                            <span key={i} className={classes.highlightChip}>{item}</span>
                                        ))}
                                    </div>
                                )}
                                <p className={classes.summaryBody}>{response.summary}</p>
                            </section>
                        )}

                        <section className={classes.comparisonSection}>
                            <div className={classes.comparisonHeader}>
                                <h3 className={classes.sectionTitle}>Before &amp; After</h3>
                                <span className={classes.comparisonHint}>Side-by-side look at the journey</span>
                            </div>
                            <div className={classes.comparison}>
                                <AttemptPanel
                                    variant="before"
                                    title="Original Attempt"
                                    problem={originalProblem}
                                    attempt={originalAttempt}
                                />
                                <div className={classes.comparisonArrow} aria-hidden="true">→</div>
                                <AttemptPanel
                                    variant="after"
                                    title="New Problem Attempt"
                                    problem={response.new_problem}
                                    attempt={response.student_attempt}
                                />
                            </div>
                        </section>

                        {improvementBullets.length > 0 && (
                            <section className={classes.winsSection}>
                                <div className={classes.sectionHeader}>
                                    <h3 className={classes.sectionTitle}>What Improved</h3>
                                    <span className={classes.sectionCount}>{improvementBullets.length} insights</span>
                                </div>
                                <div className={classes.winsGrid}>
                                    {improvementBullets.map((item, i) => (
                                        <ImprovementWin
                                            key={i}
                                            text={item}
                                            tone={classifyImprovementBullet(item)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {practiceProblems.length > 0 && (
                            <section className={classes.practiceSection}>
                                <div className={classes.sectionHeader}>
                                    <h3 className={classes.sectionTitle}>Practice Next</h3>
                                    <span className={classes.sectionCount}>
                                        {practiceProblems.length} problem{practiceProblems.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                {practiceIntro && <p className={classes.practiceIntro}>{practiceIntro}</p>}
                                <div className={classes.practiceGrid}>
                                    {practiceProblems.map((problem) => (
                                        <PracticeCard key={problem.number} problem={problem} />
                                    ))}
                                </div>
                            </section>
                        )}

                        <details className={classes.drillDetails}>
                            <summary className={classes.drillSummary}>Dive deeper into the new attempt</summary>
                            <AttemptPanel
                                variant="after"
                                title="Full breakdown"
                                problem={response.new_problem}
                                attempt={response.student_attempt}
                            />
                        </details>
                    </>
                )}
            </WorkflowTabShell>
        </>
    );
}
