import classes from "./Tutor.module.css";
import ProblemContext from "./ProblemContext";
import WorkflowTabShell from "./WorkflowTabShell";
import EmotionBadge from "./EmotionBadge";
import { getTurnLabel } from "../Utils/emotionTags";
import { useWorkflow } from "../Context/WorkflowProvider";

function ConversationTurn({ turn }) {
    const isTutor = turn.speaker === "Tutor";
    const label = getTurnLabel(turn);

    return (
        <div className={isTutor ? classes.tutorTurn : classes.studentTurn}>
            <div className={classes.messageContent}>
                <div className={classes.messageHeader}>
                    <span className={classes.speakerName}>{turn.speaker}</span>
                    {label && <EmotionBadge label={label} speaker={turn.speaker} />}
                    {!isTutor && turn.understanding_level && (
                        <span
                            className={classes.understandingLevel}
                            title={`Understanding: ${turn.understanding_level}`}
                        >
                            {turn.understanding_level}
                        </span>
                    )}
                </div>
                <p className={classes.messageText}>{turn.text}</p>
                {isTutor && turn.strategy && (
                    <p className={classes.strategyNote}>Strategy: {turn.strategy}</p>
                )}
            </div>
        </div>
    );
}

function UnderstandingCheck({ testQuestion, expectedAnswer, context }) {
    const question =
        typeof testQuestion === "string" ? testQuestion : testQuestion?.question;

    if (!question) return null;

    return (
        <section className={classes.checkSection} aria-labelledby="understanding-check-title">
            <div className={classes.checkHeader}>
                <span className={classes.sectionLabel} id="understanding-check-title">
                    Check for Understanding
                </span>
                <p className={classes.checkHint}>
                    A follow-up question the tutor asks at the end — same idea as the original
                    problem, but with different numbers, to see if the student can apply what
                    they learned.
                </p>
            </div>
            <div className={classes.checkQuestion}>{question}</div>
            {context && <p className={classes.checkContext}>{context}</p>}
            {expectedAnswer && (
                <details className={classes.educatorDetails}>
                    <summary className={classes.educatorSummary}>Answer key (for educators)</summary>
                    <p className={classes.expectedAnswer}>
                        Expected answer: <strong>{expectedAnswer}</strong>
                    </p>
                </details>
            )}
        </section>
    );
}

function SessionSummary({ summary }) {
    if (!summary || typeof summary !== "object") return null;

    const items = [
        { key: "key_breakthroughs", label: "Key breakthroughs" },
        { key: "remaining_challenges", label: "Remaining challenges" },
        { key: "next_steps", label: "Next steps" },
    ].filter(({ key }) => summary[key]);

    if (!items.length) return null;

    return (
        <details className={classes.educatorDetails}>
            <summary className={classes.educatorSummary}>Session summary</summary>
            <div className={classes.summaryContent}>
                {items.map(({ key, label }) => (
                    <div key={key} className={classes.summaryItem}>
                        <span className={classes.summaryLabel}>{label}</span>
                        <p>{summary[key]}</p>
                    </div>
                ))}
            </div>
        </details>
    );
}

export default function Tutor() {
    const { results, isLoading, error } = useWorkflow();
    const response = results?.tutor_session;

    const testQuestion = response?.test_question;
    const expectedAnswer =
        (typeof testQuestion === "object" && testQuestion?.expected_answer) ||
        response?.expected_answer;
    const checkContext =
        typeof testQuestion === "object" ? testQuestion?.context : null;

    return (
        <>
            <ProblemContext />
            <WorkflowTabShell
                title="Tutor Session"
                subtitle="Interactive tutor and student session based on the student's response patterns"
                isLoading={isLoading}
                loadingMessage="Generating the tutor session..."
                error={error}
            >
                {response && (
                    <>
                        {response.conversation?.length > 0 && (
                            <section className={classes.conversationSection}>
                                <span className={classes.sectionLabel}>Conversation</span>
                                <div className={classes.conversation}>
                                    {response.conversation.map((turn, index) => (
                                        <ConversationTurn key={index} turn={turn} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {testQuestion && (
                            <UnderstandingCheck
                                testQuestion={testQuestion}
                                expectedAnswer={expectedAnswer}
                                context={checkContext}
                            />
                        )}

                        <SessionSummary summary={response.session_summary} />
                    </>
                )}
            </WorkflowTabShell>
        </>
    );
}
