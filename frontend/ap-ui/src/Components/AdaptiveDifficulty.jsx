import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import classes from "./AdaptiveDifficulty.module.css";
import SessionManager from "../Utils/SessionManager";

export default function AdaptiveDifficulty() {
    const navigate = useNavigate();
    const [studentHistory, setStudentHistory] = useState([]);
    const [currentDifficulty, setCurrentDifficulty] = useState("medium");
    const [recommendation, setRecommendation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // const [simulatedSessions, setSimulatedSessions] = useState([]);

    useEffect(() => {
        loadStudentHistory();
        
        // Listen for storage changes to reload data when sessions are added
        const handleStorageChange = (e) => {
            if (e.key === 'learningDisabilitySessions') {
                console.log('Storage changed, reloading history...');
                loadStudentHistory();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        // Also reload when the component becomes visible (user navigates back)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('Page became visible, reloading history...');
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
        // Load real session data from SessionManager
        const realHistory = SessionManager.getAllSessions();
        console.log('Loading student history:', realHistory);
        console.log('Number of sessions found:', realHistory.length);
        console.log('Raw localStorage data:', localStorage.getItem('learningDisabilitySessions'));
        
        setStudentHistory(realHistory);
    }


    async function getAdaptiveRecommendation() {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/v1/openai/adaptive_difficulty', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_history: studentHistory,
                    current_difficulty: currentDifficulty
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get adaptive recommendation');
            }

            const data = await response.json();
            setRecommendation(data);
        } catch (error) {
            console.error('Error getting adaptive recommendation:', error);
            // Fallback to mock recommendation
            setRecommendation(generateMockRecommendation());
        } finally {
            setIsLoading(false);
        }
    }

    function generateMockRecommendation() {
        const recentSessions = studentHistory.slice(0, 5);
        const avgConsistency = recentSessions.reduce((sum, s) => sum + s.consistency_score, 0) / recentSessions.length;
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

    function createTestSession() {
        console.log('Creating test session...');
        try {
            // Create a test session to verify the system is working
            const testSession = {
                difficulty: 'medium',
                gradeLevel: '7th',
                disability: 'Dyslexia',
                consistency_score: 0.75,
                is_correct: true,
                problem: 'Test problem: What is 15 + 27?',
                duration: 120,
                timestamp: Date.now(),
                student_attempt: 'Test student attempt',
                diagnosis: 'Test diagnosis',
                tutor_response: 'Test tutor response',
                test_attempt: null,
                consistency_results: { overall_consistency_score: 0.75 },
                has_test_question: false
            };
            
            console.log('About to save test session:', testSession);
            const savedSession = SessionManager.saveSession(testSession);
            console.log('Test session created:', savedSession);
            console.log('localStorage after test save:', localStorage.getItem('learningDisabilitySessions'));
            loadStudentHistory(); // Reload to show the new session
        } catch (error) {
            console.error('Error creating test session:', error);
        }
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
                    
                    <button 
                        className={classes.testBtn}
                        onClick={createTestSession}
                    >
                        🧪 Add Test Session
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
                        <button 
                            className={classes.simulateBtn}
                            onClick={() => navigate('/')}
                        >
                            📚 Generate Math Problem
                        </button>
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

            {/* Performance Chart */}
            <div className={classes.chartSection}>
                <h3>Performance Trends</h3>
                {studentHistory.length > 0 ? (
                    <div className={classes.chartContainer}>
                        <div className={classes.chartHeader}>
                            <div className={classes.chartTitle}>Consistency & Accuracy Over Time</div>
                            <div className={classes.chartSubtitle}>Last {Math.min(studentHistory.length, 10)} sessions</div>
                        </div>
                        <div className={classes.chartBars}>
                            {studentHistory.slice(0, 10).map((session, index) => (
                                <div key={session.id || index} className={classes.chartBar}>
                                    <div className={classes.barContainer}>
                                        <div 
                                            className={classes.consistencyBar}
                                            style={{ 
                                                height: `${(session.consistency_score || 0) * 100}%`,
                                                backgroundColor: session.consistency_score > 0.7 ? '#10b981' : 
                                                               session.consistency_score > 0.4 ? '#f59e0b' : '#ef4444'
                                            }}
                                        ></div>
                                        <div 
                                            className={classes.accuracyBar}
                                            style={{ 
                                                height: `${(session.is_correct ? 1 : 0) * 100}%`,
                                                backgroundColor: session.is_correct ? '#10b981' : '#ef4444'
                                            }}
                                        ></div>
                                    </div>
                                    <div className={classes.barLabel}>
                                        <div className={classes.sessionNumber}>#{index + 1}</div>
                                        <div className={classes.sessionDifficulty}>{session.difficulty}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={classes.chartLegend}>
                            <div className={classes.legendItem}>
                                <div className={classes.legendColor} style={{backgroundColor: '#10b981'}}></div>
                                <span>Consistency Score</span>
                            </div>
                            <div className={classes.legendItem}>
                                <div className={classes.legendColor} style={{backgroundColor: '#3b82f6'}}></div>
                                <span>Accuracy (Correct/Incorrect)</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={classes.chartPlaceholder}>
                        <div className={classes.chartIcon}>📈</div>
                        <div className={classes.chartText}>Performance trend visualization</div>
                        <div className={classes.chartSubtext}>Complete some sessions to see your performance trends</div>
                    </div>
                )}
            </div>
        </div>
    );
}
