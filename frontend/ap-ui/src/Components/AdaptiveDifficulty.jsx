import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import classes from "./AdaptiveDifficulty.module.css";
import SessionManager from "../Utils/SessionManager";
import { runLangGraphWorkflow } from "../Utils/langgraphApi";

export default function AdaptiveDifficulty() {
    const [studentHistory, setStudentHistory] = useState([]);
    const [currentDifficulty, setCurrentDifficulty] = useState("medium");
    const [recommendation, setRecommendation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadStudentHistory();
        
        const handleStorageChange = (e) => {
            if (e.key === 'learningDisabilitySessions') {
                loadStudentHistory();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                loadStudentHistory();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadStudentHistory() {
        const realHistory = SessionManager.getAllSessions();
        setStudentHistory(realHistory);
    }


    async function getAdaptiveRecommendation() {
        setIsLoading(true);
        try {
            const gradeLevel = sessionStorage.getItem('gradeLevel') || '7th';
            const payload = {
                grade_level: gradeLevel,
                difficulty: currentDifficulty,
                disability: 'No disability',
                student_history: studentHistory,
                problem: sessionStorage.getItem('problem') || 'Placeholder problem for adaptive planning.',
            };

            const data = await runLangGraphWorkflow({
                ...payload,
                workflow_type: 'analysis_only',
            });
            const adaptivePlan = data?.results?.adaptive_plan;
            if (!adaptivePlan) {
                throw new Error('Adaptive plan missing from workflow results');
            }
            setRecommendation(adaptivePlan);
        } catch (error) {
            setRecommendation(generateMockRecommendation());
        } finally {
            setIsLoading(false);
        }
    }

    function generateMockRecommendation() {
        const recentSessions = studentHistory.slice(0, 5);
        if (recentSessions.length === 0) {
            return {
                recommended_difficulty: currentDifficulty,
                reasoning: "No session history yet. Stay at the current level until more data is collected.",
                confidence: 0.3,
                current_performance: {
                    consistency_score: 0,
                    accuracy_rate: 0,
                    trend: "insufficient_data"
                },
                recommendations: [
                    "Complete a few tutor sessions to unlock adaptive guidance"
                ]
            };
        }

        const avgConsistency = recentSessions.reduce((sum, s) => sum + (s.consistency_score || 0), 0) / recentSessions.length;
        const avgAccuracy = recentSessions.reduce((sum, s) => sum + (s.is_correct ? 1 : 0), 0) / recentSessions.length;

        let recommendedDifficulty = currentDifficulty;
        let reasoning = "Performance is appropriate for current level.";

        if (avgConsistency > 0.7 && avgAccuracy > 0.8) {
            recommendedDifficulty = currentDifficulty === "easy" ? "medium" : currentDifficulty === "medium" ? "hard" : "hard";
            reasoning = "Excellent performance! Ready for more challenging problems.";
        } else if (avgConsistency < 0.4 || avgAccuracy < 0.5) {
            recommendedDifficulty = currentDifficulty === "hard" ? "medium" : currentDifficulty === "medium" ? "easy" : "easy";
            reasoning = "Struggling with current level. Moving to easier problems.";
        }
        
        return {
            recommended_difficulty: recommendedDifficulty,
            reasoning,
            confidence: 0.8,
            current_performance: {
                consistency_score: avgConsistency,
                accuracy_rate: avgAccuracy,
                trend: "stable"
            },
            recommendations: [
                "Continue practicing regularly",
                "Focus on step-by-step problem solving",
                "Take breaks between sessions"
            ]
        };
    }


    function clearHistory() {
        SessionManager.clearAllSessions();
        setStudentHistory([]);
        setRecommendation(null);
    }

    function getDifficultyColor(difficulty) {
        switch (difficulty) {
            case 'easy': return classes.easy;
            case 'medium': return classes.medium;
            case 'hard': return classes.hard;
            default: return classes.medium;
        }
    }

    function getPerformanceColor(score) {
        if (score >= 0.7) return classes.high;
        if (score >= 0.4) return classes.medium;
        return classes.low;
    }

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.title}>
                    <div className={classes.icon}>🎯</div>
                    Adaptive Difficulty System
                </div>
                <p className={classes.subtitle}>
                    AI-powered difficulty adjustment based on student performance
                </p>
            </div>

            {/* Controls */}
            <div className={classes.controls}>
                <div className={classes.difficultySelector}>
                    <label>Current Difficulty:</label>
                    <select 
                        value={currentDifficulty} 
                        onChange={(e) => setCurrentDifficulty(e.target.value)}
                        className={classes.select}
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                
                <div className={classes.actionButtons}>
                    <button 
                        className={classes.refreshBtn}
                        onClick={loadStudentHistory}
                    >
                        🔄 Refresh Data
                    </button>
                    
                    <button 
                        className={classes.analyzeBtn}
                        onClick={getAdaptiveRecommendation}
                        disabled={isLoading}
                    >
                        {isLoading ? '🔄 Analyzing...' : '🧠 Get AI Recommendation'}
                    </button>
                    
                    <button 
                        className={classes.clearBtn}
                        onClick={clearHistory}
                    >
                        🗑️ Clear History
                    </button>
                </div>
            </div>

            {/* Recommendation Display */}
            {recommendation && (
                <div className={classes.recommendationCard}>
                    <div className={classes.recommendationHeader}>
                        <h3>AI Recommendation</h3>
                        <div className={classes.confidence}>
                            Confidence: {(recommendation.confidence * 100).toFixed(0)}%
                        </div>
                    </div>
                    
                    <div className={classes.recommendationContent}>
                        <div className={classes.difficultyRecommendation}>
                            <div className={classes.currentDifficulty}>
                                <span className={classes.label}>Current:</span>
                                <span className={`${classes.difficultyBadge} ${getDifficultyColor(currentDifficulty)}`}>
                                    {currentDifficulty.toUpperCase()}
                                </span>
                            </div>
                            
                            <div className={classes.arrow}>→</div>
                            
                            <div className={classes.recommendedDifficulty}>
                                <span className={classes.label}>Recommended:</span>
                                <span className={`${classes.difficultyBadge} ${getDifficultyColor(recommendation.recommended_difficulty)}`}>
                                    {recommendation.recommended_difficulty.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        
                        <div className={classes.reasoning}>
                            <strong>Reasoning:</strong> {recommendation.reasoning}
                        </div>
                        
                        {recommendation.current_performance && (
                            <div className={classes.performanceMetrics}>
                                <div className={classes.metric}>
                                    <span className={classes.metricLabel}>Consistency:</span>
                                    <span className={`${classes.metricValue} ${getPerformanceColor(recommendation.current_performance.consistency_score)}`}>
                                        {(recommendation.current_performance.consistency_score * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className={classes.metric}>
                                    <span className={classes.metricLabel}>Accuracy:</span>
                                    <span className={`${classes.metricValue} ${getPerformanceColor(recommendation.current_performance.accuracy_rate)}`}>
                                        {(recommendation.current_performance.accuracy_rate * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className={classes.metric}>
                                    <span className={classes.metricLabel}>Trend:</span>
                                    <span className={classes.metricValue}>
                                        {recommendation.current_performance.trend}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {recommendation.recommendations && (
                            <div className={classes.recommendations}>
                                <strong>Specific Recommendations:</strong>
                                <ul>
                                    {recommendation.recommendations.map((rec, index) => (
                                        <li key={index}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Session History */}
            <div className={classes.historySection}>
                <h3>Session History ({studentHistory.length} sessions)</h3>
                {studentHistory.length === 0 ? (
                    <div className={classes.emptyState}>
                        <div className={classes.emptyIcon}>📊</div>
                        <div className={classes.emptyTitle}>No Performance Data Yet</div>
                        <div className={classes.emptyText}>
                            Complete a student simulation to see adaptive difficulty analysis and performance insights.
                        </div>
                        <Link 
                            className={classes.simulateBtn}
                            to="/"
                        >
                            📚 Generate Math Problem
                        </Link>
                    </div>
                ) : (
                    <div className={classes.sessionsList}>
                        {studentHistory.slice(0, 10).map((session) => (
                        <div key={session.id} className={classes.sessionCard}>
                            <div className={classes.sessionHeader}>
                                <div className={classes.sessionInfo}>
                                    <div className={classes.sessionTitle}>
                                        {session.problem}
                                    </div>
                                    <div className={classes.sessionMeta}>
                                        {session.disability} • {new Date(session.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className={classes.sessionStats}>
                                    <span className={`${classes.difficultyBadge} ${getDifficultyColor(session.difficulty)}`}>
                                        {session.difficulty}
                                    </span>
                                    <span className={`${classes.consistencyScore} ${getPerformanceColor(session.consistency_score)}`}>
                                        {(session.consistency_score * 100).toFixed(0)}%
                                    </span>
                                    <span className={classes.correctnessBadge}>
                                        {session.is_correct ? '✅' : '❌'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>

            <div className={classes.chartSection}>
                <h3>Result Breakdown</h3>
                {studentHistory.length > 0 ? (
                    <PerformanceSummary sessions={studentHistory} />
                ) : (
                    <div className={classes.chartPlaceholder}>
                        <div className={classes.chartIcon}>📈</div>
                        <div className={classes.chartText}>No Results Yet</div>
                        <div className={classes.chartSubtext}>Complete some sessions to see result breakdown</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PerformanceSummary({ sessions }) {
    const total = sessions.length;

    if (!total) {
        return (
            <div className={classes.chartPlaceholder}>
                <div className={classes.chartIcon}>📈</div>
                <div className={classes.chartText}>No Results Yet</div>
                <div className={classes.chartSubtext}>Complete some sessions to see result breakdown</div>
            </div>
        );
    }

    const stats = [
        { label: 'Correct', count: sessions.filter((s) => s.is_correct === true).length, color: '#16a34a' },
        { label: 'Incorrect', count: sessions.filter((s) => s.is_correct === false).length, color: '#ef4444' },
    ];

    const unknownCount = total - stats[0].count - stats[1].count;
    if (unknownCount > 0) {
        stats.push({ label: 'No Result', count: unknownCount, color: '#94a3b8' });
    }

    let cumulativeAngle = 0;
    const radius = 70;
    const center = 80;

    const slices = stats
        .filter((segment) => segment.count > 0)
        .map((segment, index) => {
            const startAngle = cumulativeAngle;
            const angle = (segment.count / total) * 360;
            cumulativeAngle += angle;
            const endAngle = cumulativeAngle;

            return {
                ...segment,
                percentage: ((segment.count / total) * 100).toFixed(0),
                path: describeArc(center, center, radius, startAngle, endAngle),
                animationDelay: `${index * 80}ms`,
            };
        });

    return (
        <div className={classes.summaryGrid}>
            <svg
                className={classes.pieSvg}
                viewBox="0 0 160 160"
                role="img"
                aria-label="Session outcome distribution"
            >
                <circle cx={center} cy={center} r={radius} className={classes.pieBackground} />
                {slices.map((slice) => (
                    <path
                        key={slice.label}
                        d={slice.path}
                        fill={slice.color}
                        className={classes.pieSlice}
                        style={{ animationDelay: slice.animationDelay }}
                    />
                ))}
                <circle cx={center} cy={center} r={radius - 26} className={classes.pieInner} />
                <text x={center} y={center - 4} className={classes.pieTotal} textAnchor="middle">
                    {total}
                </text>
                <text x={center} y={center + 16} className={classes.pieSubtext} textAnchor="middle">
                    sessions
                </text>
            </svg>
            <div className={classes.pieLegend}>
                {slices.map((slice) => (
                    <div key={slice.label} className={classes.legendRow}>
                        <span className={classes.legendSwatch} style={{ background: slice.color }}></span>
                        <span className={classes.legendLabel}>{slice.label}</span>
                        <span className={classes.legendValue}>
                            {slice.count} ({slice.percentage}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}

function describeArc(x, y, radius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [`M`, start.x, start.y, `A`, radius, radius, 0, largeArcFlag, 0, end.x, end.y, `L`, x, y, `Z`].join(' ');
}
