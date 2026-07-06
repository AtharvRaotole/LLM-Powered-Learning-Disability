import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import classes from "./AdaptiveDifficulty.module.css";
import SessionManager from "../Utils/SessionManager";
import { getAdaptiveDifficultyRecommendation } from "../Utils/langgraphApi";
import GradeDifficultyControls from "./GradeDifficultyControls";
import {
    DEFAULT_DIFFICULTY,
    DEFAULT_GRADE_LEVEL,
    getDifficultyLabel,
    persistGradeAndDifficulty,
    readStoredDifficulty,
    readStoredGradeLevel,
} from "../Utils/gradeConfig";

function formatPercent(value) {
    if (value == null || Number.isNaN(value)) return "—";
    return `${Math.round(value * 100)}%`;
}

function formatTrend(trend) {
    if (!trend) return "—";
    return String(trend).replace(/_/g, " ");
}

export default function AdaptiveDifficulty() {
    const [studentHistory, setStudentHistory] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [gradeLevel, setGradeLevel] = useState(() => readStoredGradeLevel() || DEFAULT_GRADE_LEVEL);
    const [currentDifficulty, setCurrentDifficulty] = useState(() => readStoredDifficulty() || DEFAULT_DIFFICULTY);
    const [recommendation, setRecommendation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadStudentHistory();

        const handleStorageChange = (e) => {
            if (e.key === "learningDisabilitySessions") {
                loadStudentHistory();
            }
        };

        window.addEventListener("storage", handleStorageChange);

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                loadStudentHistory();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        persistGradeAndDifficulty(gradeLevel, currentDifficulty);
    }, [gradeLevel, currentDifficulty]);

    function loadStudentHistory() {
        const history = SessionManager.getAllSessions();
        setStudentHistory(history);
        setMetrics(SessionManager.calculatePerformanceMetrics(history));
    }

    async function getAdaptiveRecommendation() {
        setIsLoading(true);
        setError(null);
        setRecommendation(null);

        try {
            const data = await getAdaptiveDifficultyRecommendation({
                grade_level: gradeLevel,
                difficulty: currentDifficulty,
                student_history: studentHistory,
            });
            const adaptivePlan = data?.results?.adaptive_plan;
            if (!adaptivePlan) {
                throw new Error("Adaptive plan missing from workflow results");
            }
            setRecommendation(adaptivePlan);
        } catch (err) {
            setError(`Failed to get recommendation: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    function clearHistory() {
        if (!window.confirm("Clear all session history? This cannot be undone.")) {
            return;
        }
        SessionManager.clearAllSessions();
        setStudentHistory([]);
        setMetrics(SessionManager.calculatePerformanceMetrics([]));
        setRecommendation(null);
        setError(null);
    }

    function getDifficultyBadgeClass(difficulty) {
        switch (difficulty) {
            case "easy": return classes.badgeEasy;
            case "hard": return classes.badgeHard;
            default: return classes.badgeMedium;
        }
    }

    return (
        <div className={classes.page}>
            <header className={classes.header}>
                <h1 className={classes.largeTitle}>Adaptive Difficulty</h1>
                <p className={classes.subtitle}>
                    Review simulation history and get a difficulty recommendation based on student performance.
                </p>
            </header>

            <section className={classes.controlsCard}>
                <GradeDifficultyControls
                    gradeLevel={gradeLevel}
                    difficulty={currentDifficulty}
                    onGradeChange={setGradeLevel}
                    onDifficultyChange={setCurrentDifficulty}
                />
                <div className={classes.actionRow}>
                    <button
                        type="button"
                        className={classes.primaryBtn}
                        onClick={getAdaptiveRecommendation}
                        disabled={isLoading}
                    >
                        {isLoading ? "Analyzing…" : "Get Recommendation"}
                    </button>
                    <button
                        type="button"
                        className={classes.secondaryBtn}
                        onClick={loadStudentHistory}
                        disabled={isLoading}
                    >
                        Refresh Data
                    </button>
                    <button
                        type="button"
                        className={classes.destructiveBtn}
                        onClick={clearHistory}
                        disabled={isLoading || studentHistory.length === 0}
                    >
                        Clear History
                    </button>
                </div>
            </section>

            {isLoading && (
                <div className={classes.statusBanner}>
                    <span className={classes.spinner} aria-hidden="true" />
                    Analyzing performance data…
                </div>
            )}

            {error && (
                <div className={classes.errorBanner} role="alert">
                    {error}
                </div>
            )}

            {metrics && studentHistory.length > 0 && (
                <section className={classes.groupedList}>
                    <section className={classes.group}>
                        <div className={classes.groupHeader}>Performance Summary</div>
                        <div className={classes.summaryGrid}>
                            <div className={classes.summaryCell}>
                                <span className={classes.summaryValue}>{metrics.totalSessions}</span>
                                <span className={classes.summaryLabel}>Sessions</span>
                            </div>
                            <div className={classes.summaryCell}>
                                <span className={classes.summaryValue}>{formatPercent(metrics.averageConsistency)}</span>
                                <span className={classes.summaryLabel}>Avg Consistency</span>
                            </div>
                            <div className={classes.summaryCell}>
                                <span className={classes.summaryValue}>{formatPercent(metrics.averageAccuracy)}</span>
                                <span className={classes.summaryLabel}>Accuracy</span>
                            </div>
                            <div className={classes.summaryCell}>
                                <span className={classes.summaryValue}>
                                    {metrics.improvementRate > 0 ? "+" : ""}
                                    {Math.round(metrics.improvementRate)}%
                                </span>
                                <span className={classes.summaryLabel}>Trend</span>
                            </div>
                        </div>
                    </section>
                </section>
            )}

            {recommendation && (
                <section className={classes.groupedList}>
                    <section className={classes.group}>
                        <div className={classes.groupHeader}>Recommendation</div>
                        <div className={classes.groupCell}>
                            <div className={classes.difficultyRow}>
                                <div className={classes.difficultyBlock}>
                                    <span className={classes.difficultyLabel}>Current</span>
                                    <span className={`${classes.badge} ${getDifficultyBadgeClass(currentDifficulty)}`}>
                                        {getDifficultyLabel(currentDifficulty)}
                                    </span>
                                </div>
                                <span className={classes.difficultyArrow} aria-hidden="true">→</span>
                                <div className={classes.difficultyBlock}>
                                    <span className={classes.difficultyLabel}>Recommended</span>
                                    <span className={`${classes.badge} ${getDifficultyBadgeClass(recommendation.recommended_difficulty)}`}>
                                        {getDifficultyLabel(recommendation.recommended_difficulty)}
                                    </span>
                                </div>
                            </div>

                            {recommendation.confidence != null && (
                                <div className={classes.metaRow}>
                                    <span className={classes.metaChip}>
                                        {Math.round(recommendation.confidence * 100)}% confidence
                                    </span>
                                </div>
                            )}

                            <p className={classes.reasoningText}>{recommendation.reasoning}</p>

                            {recommendation.current_performance && (
                                <div className={classes.metaRow}>
                                    <span className={classes.metaChip}>
                                        Consistency: {formatPercent(recommendation.current_performance.consistency_score)}
                                    </span>
                                    <span className={classes.metaChip}>
                                        Accuracy: {formatPercent(recommendation.current_performance.accuracy_rate)}
                                    </span>
                                    <span className={classes.metaChip}>
                                        Trend: {formatTrend(recommendation.current_performance.trend)}
                                    </span>
                                </div>
                            )}

                            {recommendation.recommendations?.length > 0 && (
                                <ul className={classes.tipList}>
                                    {recommendation.recommendations.map((tip, index) => (
                                        <li key={index}>{tip}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                </section>
            )}

            <section className={classes.groupedList}>
                <section className={classes.group}>
                    <div className={classes.groupHeader}>
                        Session History ({studentHistory.length})
                    </div>

                    {studentHistory.length === 0 ? (
                        <div className={classes.emptyState}>
                            <p className={classes.emptyTitle}>No performance data yet</p>
                            <p className={classes.emptyText}>
                                Complete a disability simulation to build session history for adaptive recommendations.
                            </p>
                            <Link className={classes.primaryBtn} to="/">
                                Go to Problem Generator
                            </Link>
                        </div>
                    ) : (
                        <div className={classes.sessionList}>
                            {studentHistory.slice(0, 10).map((session) => (
                                <div key={session.id} className={classes.sessionRow}>
                                    <div className={classes.sessionMain}>
                                        <p className={classes.sessionProblem}>{session.problem}</p>
                                        <p className={classes.sessionMeta}>
                                            {session.disability || "No disability"}
                                            {" · "}
                                            {new Date(session.timestamp).toLocaleDateString()}
                                            {session.is_correct != null && (
                                                <> · {session.is_correct ? "Correct" : "Incorrect"}</>
                                            )}
                                        </p>
                                    </div>
                                    <div className={classes.sessionAside}>
                                        <span className={`${classes.badge} ${getDifficultyBadgeClass(session.difficulty)}`}>
                                            {getDifficultyLabel(session.difficulty)}
                                        </span>
                                        {session.consistency_score != null && (
                                            <span className={classes.metaChip}>
                                                {formatPercent(session.consistency_score)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </div>
    );
}
