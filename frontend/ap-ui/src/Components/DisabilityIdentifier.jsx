import { useState } from "react";
import classes from "./DisabilityIdentifier.module.css";
import {
    startDisabilityAssessment,
    evaluateDisabilityAssessment,
} from "../Utils/langgraphApi";
import GradeDifficultyControls from "./GradeDifficultyControls";
import {
    DEFAULT_DIFFICULTY,
    DEFAULT_GRADE_LEVEL,
    readStoredDifficulty,
    readStoredGradeLevel,
} from "../Utils/gradeConfig";

const MAX_ROUNDS = 3;

export default function DisabilityIdentifier() {
    const [gradeLevel, setGradeLevel] = useState(() => readStoredGradeLevel() || DEFAULT_GRADE_LEVEL);
    const [difficulty, setDifficulty] = useState(() => readStoredDifficulty() || DEFAULT_DIFFICULTY);
    const [phase, setPhase] = useState("idle");
    const [loadingMessage, setLoadingMessage] = useState("");
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [roundNumber, setRoundNumber] = useState(1);
    const [history, setHistory] = useState([]);
    const [followUpMessage, setFollowUpMessage] = useState("");
    const [verdict, setVerdict] = useState(null);
    const [confidence, setConfidence] = useState(null);
    const [confidenceLabel, setConfidenceLabel] = useState("");
    const [error, setError] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    function resetAssessment() {
        setPhase("idle");
        setCurrentQuestion(null);
        setCurrentAnswer("");
        setRoundNumber(1);
        setHistory([]);
        setFollowUpMessage("");
        setVerdict(null);
        setConfidence(null);
        setConfidenceLabel("");
        setError(null);
        setHistoryOpen(false);
    }

    async function handleStart() {
        setError(null);
        setPhase("loading");
        setLoadingMessage("Generating your assessment question…");

        try {
            const data = await startDisabilityAssessment({
                grade_level: gradeLevel,
                difficulty,
            });
            setCurrentQuestion(data.question);
            setRoundNumber(data.round_number);
            setPhase("question");
        } catch (err) {
            console.error("Start assessment error:", err);
            setError("Failed to start assessment. Please try again.");
            setPhase("idle");
        }
    }

    async function handleSubmitAnswer() {
        if (!currentAnswer.trim()) {
            setError("Please enter your answer before submitting.");
            return;
        }

        setError(null);
        setPhase("loading");
        setLoadingMessage("Analyzing your response…");

        const rounds = [
            ...history,
            { question: currentQuestion.problem, answer: currentAnswer.trim() },
        ];

        try {
            const result = await evaluateDisabilityAssessment({
                grade_level: gradeLevel,
                difficulty,
                rounds,
                round_number: roundNumber,
            });

            if (result.status === "needs_follow_up") {
                setHistory(rounds);
                setFollowUpMessage(result.message);
                setCurrentQuestion(result.next_question);
                setRoundNumber(result.round_number);
                setCurrentAnswer("");
                setPhase("follow_up");
                return;
            }

            setHistory(rounds);
            setVerdict(result.verdict);
            setConfidence(result.confidence);
            setConfidenceLabel(result.confidence_label || result.verdict?.confidence_label || "");
            setPhase("verdict");
        } catch (err) {
            console.error("Evaluate assessment error:", err);
            setError("Failed to analyze your response. Please try again.");
            setPhase(history.length > 0 ? "follow_up" : "question");
        }
    }

    const isLoading = phase === "loading";
    const showQuestion = phase === "question" || phase === "follow_up";
    const verdictTitle = verdict?.primary_disability === "No disability"
        ? "No Learning Disability Indicators Detected"
        : verdict?.primary_disability;

    return (
        <div className={classes.page}>
            <header className={classes.header}>
                <h1 className={classes.largeTitle}>Disability Assessment</h1>
                <p className={classes.subtitle}>
                    Work through a few diagnostic math questions. We'll analyze how you solve them
                    and share an assessment when we're confident enough.
                </p>
            </header>

            {phase === "idle" && (
                <section className={classes.controlsCard}>
                    <GradeDifficultyControls
                        gradeLevel={gradeLevel}
                        difficulty={difficulty}
                        onGradeChange={setGradeLevel}
                        onDifficultyChange={setDifficulty}
                    />
                    <button
                        type="button"
                        className={classes.primaryBtn}
                        onClick={handleStart}
                        disabled={isLoading}
                    >
                        Start Assessment
                    </button>
                </section>
            )}

            {(showQuestion || isLoading) && phase !== "idle" && phase !== "verdict" && (
                <div className={classes.progressChip}>
                    Question {roundNumber} of {MAX_ROUNDS}
                </div>
            )}

            {phase === "follow_up" && followUpMessage && (
                <div className={classes.infoBanner} role="status">
                    {followUpMessage}
                </div>
            )}

            {history.length > 0 && showQuestion && (
                <section className={classes.group}>
                    <button
                        type="button"
                        className={classes.disclosureRow}
                        onClick={() => setHistoryOpen(!historyOpen)}
                        aria-expanded={historyOpen}
                    >
                        <span>Previous answers ({history.length})</span>
                        <span className={classes.disclosureChevron}>{historyOpen ? "−" : "+"}</span>
                    </button>
                    {historyOpen && (
                        <div className={classes.disclosureContent}>
                            {history.map((round, idx) => (
                                <div key={idx} className={classes.historyItem}>
                                    <p className={classes.historyQuestion}>
                                        <span className={classes.historyLabel}>Q{idx + 1}</span>
                                        {round.question}
                                    </p>
                                    <p className={classes.historyAnswer}>{round.answer}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {showQuestion && currentQuestion && (
                <section className={classes.groupedList}>
                    <section className={classes.group}>
                        <div className={classes.groupHeader}>Question</div>
                        <div className={classes.groupCell}>
                            <p className={classes.questionText}>{currentQuestion.problem}</p>
                        </div>
                    </section>

                    <section className={classes.group}>
                        <div className={classes.groupHeader}>Your Answer</div>
                        <div className={classes.groupCell}>
                            <textarea
                                id="response"
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder="Show your work and final answer…"
                                className={classes.textarea}
                                rows={6}
                                aria-label="Your answer"
                            />
                        </div>
                    </section>

                    <div className={classes.actionRow}>
                        <button
                            type="button"
                            className={classes.primaryBtn}
                            onClick={handleSubmitAnswer}
                            disabled={isLoading || !currentAnswer.trim()}
                        >
                            Submit Answer
                        </button>
                        <button
                            type="button"
                            className={classes.secondaryBtn}
                            onClick={resetAssessment}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                    </div>
                </section>
            )}

            {isLoading && (
                <div className={classes.statusBanner}>
                    <span className={classes.spinner} aria-hidden="true" />
                    {loadingMessage}
                </div>
            )}

            {error && (
                <div className={classes.errorBanner} role="alert">
                    {error}
                </div>
            )}

            {phase === "verdict" && verdict && (
                <section className={classes.groupedList}>
                    <section className={classes.group}>
                        <div className={classes.groupHeader}>Assessment Result</div>
                        <div className={classes.groupCell}>
                            <h2 className={classes.verdictTitle}>{verdictTitle}</h2>
                            {confidence !== null && (
                                <span className={`${classes.confidenceChip} ${classes[confidenceLabel] || ""}`}>
                                    {Math.round(confidence * 100)}% confidence
                                    {confidenceLabel ? ` · ${confidenceLabel}` : ""}
                                </span>
                            )}
                        </div>
                    </section>

                    {verdict.reasoning && (
                        <section className={classes.group}>
                            <div className={classes.groupHeader}>Analysis</div>
                            <div className={classes.groupCell}>
                                <p className={classes.bodyText}>{verdict.reasoning}</p>
                            </div>
                        </section>
                    )}

                    {verdict.indicators?.length > 0 && (
                        <section className={classes.group}>
                            <div className={classes.groupHeader}>Indicators Observed</div>
                            <div className={classes.groupCell}>
                                <ul className={classes.list}>
                                    {verdict.indicators.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}

                    {verdict.error_patterns?.length > 0 && (
                        <section className={classes.group}>
                            <div className={classes.groupHeader}>Error Patterns</div>
                            <div className={classes.groupCell}>
                                <ul className={classes.list}>
                                    {verdict.error_patterns.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}

                    {verdict.strengths_observed?.length > 0 && (
                        <section className={classes.group}>
                            <div className={classes.groupHeader}>Strengths Observed</div>
                            <div className={classes.groupCell}>
                                <ul className={classes.list}>
                                    {verdict.strengths_observed.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}

                    {verdict.recommendations?.length > 0 && (
                        <section className={classes.group}>
                            <div className={classes.groupHeader}>Recommendations</div>
                            <div className={classes.groupCell}>
                                <ul className={classes.list}>
                                    {verdict.recommendations.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}

                    {verdict.professional_consultation && (
                        <section className={classes.group}>
                            <div className={classes.groupHeader}>Important Notice</div>
                            <div className={classes.groupCell}>
                                <p className={classes.noticeText}>{verdict.professional_consultation}</p>
                            </div>
                        </section>
                    )}

                    <button
                        type="button"
                        className={classes.primaryBtn}
                        onClick={resetAssessment}
                    >
                        Start New Assessment
                    </button>
                </section>
            )}
        </div>
    );
}
