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
    const [phase, setPhase] = useState("idle"); // idle | question | loading | follow_up | verdict
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
            setConfidenceLabel(result.confidence_label || result.verdict?.confidence_label);
            setPhase("verdict");
        } catch (err) {
            console.error("Evaluate assessment error:", err);
            setError("Failed to analyze your response. Please try again.");
            setPhase(history.length > 0 ? "follow_up" : "question");
        }
    }

    const isLoading = phase === "loading";
    const showQuestion = phase === "question" || phase === "follow_up";

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.title}>
                    <div className={classes.icon}>🔍</div>
                    Disability Assessment
                </div>
                <p className={classes.subtitle}>
                    Work through a few diagnostic math questions. We'll look at how you solve
                    them and share an assessment when we're confident enough.
                </p>
            </div>

            {phase === "idle" && (
                <div className={classes.settingsSection}>
                    <div className={classes.settingsRow}>
                        <GradeDifficultyControls
                            gradeLevel={gradeLevel}
                            difficulty={difficulty}
                            onGradeChange={setGradeLevel}
                            onDifficultyChange={setDifficulty}
                            compact
                        />
                    </div>
                    <button
                        className={classes.analyzeBtn}
                        onClick={handleStart}
                        disabled={isLoading}
                    >
                        🎯 Start Assessment
                    </button>
                </div>
            )}

            {(showQuestion || isLoading) && phase !== "idle" && phase !== "verdict" && (
                <div className={classes.progressBar}>
                    Question {roundNumber} of {MAX_ROUNDS}
                </div>
            )}

            {phase === "follow_up" && followUpMessage && (
                <div className={classes.followUpBanner}>
                    <span className={classes.followUpIcon}>ℹ️</span>
                    {followUpMessage}
                </div>
            )}

            {history.length > 0 && showQuestion && (
                <div className={classes.historySection}>
                    <button
                        type="button"
                        className={classes.historyToggle}
                        onClick={() => setHistoryOpen(!historyOpen)}
                    >
                        {historyOpen ? "▼" : "▶"} Previous answers ({history.length})
                    </button>
                    {historyOpen && (
                        <div className={classes.historyList}>
                            {history.map((round, idx) => (
                                <div key={idx} className={classes.historyItem}>
                                    <div className={classes.historyQuestion}>
                                        <strong>Q{idx + 1}:</strong> {round.question}
                                    </div>
                                    <div className={classes.historyAnswer}>
                                        <strong>Your answer:</strong> {round.answer}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showQuestion && currentQuestion && (
                <div className={classes.inputSection}>
                    <div className={classes.questionCard}>
                        <div className={classes.questionLabel}>Your Question</div>
                        <p className={classes.questionText}>{currentQuestion.problem}</p>
                    </div>

                    <div className={classes.inputGroup}>
                        <label htmlFor="response" className={classes.label}>
                            Your Answer
                        </label>
                        <textarea
                            id="response"
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            placeholder="Show your work and final answer…"
                            className={classes.textarea}
                            rows={6}
                        />
                    </div>

                    <div className={classes.actionRow}>
                        <button
                            className={classes.analyzeBtn}
                            onClick={handleSubmitAnswer}
                            disabled={isLoading || !currentAnswer.trim()}
                        >
                            {isLoading ? "⏳" : "✓"} Submit Answer
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
                </div>
            )}

            {isLoading && (
                <div className={classes.loading}>
                    {loadingMessage}
                </div>
            )}

            {error && (
                <div className={classes.error}>
                    {error}
                </div>
            )}

            {phase === "verdict" && verdict && (
                <div className={classes.results}>
                    <div className={`${classes.verdictHero} ${classes[confidenceLabel] || ""}`}>
                        <div className={classes.verdictLabel}>Assessment Result</div>
                        <div className={classes.verdictName}>
                            {verdict.primary_disability === "No disability"
                                ? "No Learning Disability Indicators Detected"
                                : verdict.primary_disability}
                        </div>
                        {confidence !== null && (
                            <span className={`${classes.confidence} ${classes[confidenceLabel]}`}>
                                {Math.round(confidence * 100)}% confidence ({confidenceLabel})
                            </span>
                        )}
                    </div>

                    {verdict.reasoning && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>Analysis</h4>
                            <p className={classes.reasoningText}>{verdict.reasoning}</p>
                        </div>
                    )}

                    {verdict.indicators?.length > 0 && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>Indicators Observed</h4>
                            <ul className={classes.patternList}>
                                {verdict.indicators.map((item, index) => (
                                    <li key={index} className={classes.patternItem}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {verdict.error_patterns?.length > 0 && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>Error Patterns</h4>
                            <ul className={classes.patternList}>
                                {verdict.error_patterns.map((item, index) => (
                                    <li key={index} className={classes.patternItem}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {verdict.strengths_observed?.length > 0 && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>Strengths Observed</h4>
                            <ul className={classes.strengthsList}>
                                {verdict.strengths_observed.map((item, index) => (
                                    <li key={index} className={classes.strengthItem}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {verdict.recommendations?.length > 0 && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>Recommendations</h4>
                            <ul className={classes.recommendationsList}>
                                {verdict.recommendations.map((item, index) => (
                                    <li key={index} className={classes.recommendationItem}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {verdict.professional_consultation && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>Important Notice</h4>
                            <div className={classes.consultationNote}>
                                {verdict.professional_consultation}
                            </div>
                        </div>
                    )}

                    <button
                        className={classes.analyzeBtn}
                        onClick={resetAssessment}
                    >
                        🔄 Start New Assessment
                    </button>
                </div>
            )}
        </div>
    );
}
