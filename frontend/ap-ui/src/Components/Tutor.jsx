import { useEffect,useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DisabilitiesEnum from "../Store/Disabilities";
import classes from "./Tutor.module.css";
import SessionManager from "../Utils/SessionManager";
export default function Tutor(){
    const {id}=useParams();
    const navigate = useNavigate();
    const disability=DisabilitiesEnum[id];
    const problem=sessionStorage.getItem('problem');
    const[response,setResponse]=useState(null);
    // const[studentAttempt,setStudentAttempt]=useState(null);
    // const[diagnosis,setDiagnosis]=useState(null);
    const[testResult,setTestResult]=useState(null);
    const[passFail,setPassFail]=useState(null);
    const[consistencyResults,setConsistencyResults]=useState(null);
    const[isLoading,setIsLoading]=useState(true);
    const[error,setError]=useState(null);
    const[performanceData,setPerformanceData]=useState(null);
    const[countdown,setCountdown]=useState(0);
    
    // Auto-navigate effect
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                if (countdown === 1) {
                    console.log('Auto-navigation triggered!');
                    navigate('/adaptive-difficulty');
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown, navigate]);

    // Test function to verify API connectivity
    async function testAPIConnectivity() {
        try {
            console.log('Testing API connectivity...');
            const response = await fetch("http://localhost:8000/api/v1/openai/generate_problem?grade_level=7th&difficulty=medium");
            console.log('API test response status:', response.status);
            if (response.ok) {
                console.log('✅ API connectivity test passed');
            } else {
                console.log('❌ API connectivity test failed');
            }
        } catch (error) {
            console.error('❌ API connectivity test error:', error);
        }
    }

    useEffect(()=>{
        async function orchestrate(){
            console.log('orchestrate function called');
            console.log('disability:', disability);
            console.log('problem:', problem);
            
            // Test API connectivity first
            await testAPIConnectivity();
            
            try{
                setIsLoading(true);
                setError(null);
                // 1) LLM-S attempt
                console.log('About to call generate_attempt with:');
                console.log('- disability:', disability, typeof disability);
                console.log('- problem:', problem, typeof problem);
                
                const requestBody = { disability: disability, problem: problem };
                console.log('Request body:', requestBody);
                
                console.log('Making fetch request to generate_attempt...');
                const attemptRes = await fetch("http://localhost:8000/api/v1/openai/generate_attempt", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(requestBody)
                }).catch(error => {
                    console.error('Fetch error:', error);
                    throw error;
                });
                
                console.log('Fetch completed, status:', attemptRes.status);
                if(!attemptRes.ok) {
                    const errorText = await attemptRes.text();
                    console.error('API Error Response:', errorText);
                    console.error('Status:', attemptRes.status);
                    throw new Error(`Failed to generate student attempt: ${attemptRes.status} ${errorText}`);
                }
                const attemptJson = await attemptRes.json();
                // setStudentAttempt(attemptJson);

                const attemptText = JSON.stringify(attemptJson);

                // 2) LLM-T diagnosis
                const thoughtRes = await fetch("http://localhost:8000/api/v1/openai/generate_thought", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ disability: disability, problem: problem, student_attempt: attemptText })
                });
                if(!thoughtRes.ok) throw new Error("Failed to generate diagnosis");
                const thoughtJson = await thoughtRes.json();
                // setDiagnosis(thoughtJson);

                // 2.5) Validate consistency
                const expectedAnswer = sessionStorage.getItem('answer');
                let consistencyJson = null;
                if(expectedAnswer) {
                    try {
                        const consistencyRes = await fetch("http://localhost:8000/api/v1/openai/validate_consistency", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                                problem: problem, 
                                disability: disability, 
                                student_attempt: attemptText,
                                expected_answer: expectedAnswer
                            })
                        });
                        if(consistencyRes.ok) {
                            consistencyJson = await consistencyRes.json();
                            setConsistencyResults(consistencyJson);
                        }
                    } catch(err) {
                        console.warn("Consistency validation failed:", err);
                    }
                }

                const thoughtText = JSON.stringify(thoughtJson);

                // 3) LLM-T tutor + test question
                const tutorRes = await fetch("http://localhost:8000/api/v1/openai/generate_tutor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ disability: disability, problem: problem, student_attempt: attemptText, thought_analysis: thoughtText })
                });
                if(!tutorRes.ok) throw new Error("Failed to generate tutor session");
                const tutorJson = await tutorRes.json();
                console.log('Tutor response:', tutorJson);
                console.log('Has test question:', !!tutorJson?.test_question);
                setResponse(tutorJson);

                // Save basic session data first (before test question)
                let testAttemptJson = null;
                let passed = false;
                
                // Determine correctness based on multiple factors
                // 1) Check if consistency score indicates good performance
                const consistencyScore = consistencyJson?.overall_consistency_score || 0;
                let isCorrectByConsistency = consistencyScore >= 0.7; // High consistency suggests correctness
                
                // 2) Check if there are no major errors in consistency validation
                const hasNoMajorErrors = !consistencyJson?.major_inconsistencies || consistencyJson.major_inconsistencies.length === 0;
                
                // 3) LLM-S answers the test question if provided
                if(tutorJson?.test_question){
                    const testAttemptRes = await fetch("http://localhost:8000/api/v1/openai/generate_attempt", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ disability: disability, problem: tutorJson.test_question })
                    });
                    if(testAttemptRes.ok){
                        testAttemptJson = await testAttemptRes.json();
                        const studentAnswer = extractFinalAnswer(testAttemptJson);
                        const expectedAnswer = (tutorJson.expected_answer || "").toString().trim();
                        const testPassed = normalizeAnswer(studentAnswer) === normalizeAnswer(expectedAnswer) && expectedAnswer !== "";
                        
                        // If there's a test question, use its result
                        passed = testPassed;
                        
                        setTestResult({
                            question: tutorJson.test_question,
                            expected: expectedAnswer,
                            student: testAttemptJson,
                            studentAnswer: studentAnswer
                        });
                        setPassFail(passed ? 'pass' : 'fail');
                    }
                } else {
                    // No test question - use consistency and error analysis
                    passed = isCorrectByConsistency && hasNoMajorErrors;
                }

                // Save session data to SessionManager with performance metrics (always save)
                console.log('Reached session save point!');
                const sessionData = {
                    difficulty: sessionStorage.getItem('difficulty') || 'medium',
                    gradeLevel: sessionStorage.getItem('gradeLevel') || '7th',
                    disability: disability.name,
                    consistency_score: consistencyJson?.overall_consistency_score || 0.5,
                    is_correct: passed,
                    problem: problem,
                    duration: Math.floor(Math.random() * 300) + 60,
                    timestamp: Date.now(),
                    student_attempt: attemptJson,
                    diagnosis: thoughtJson,
                    tutor_response: tutorJson,
                    test_attempt: testAttemptJson,
                    consistency_results: consistencyJson,
                    has_test_question: !!tutorJson?.test_question
                };
                
                // Save session data
                console.log('About to save session data:', sessionData);
                const savedSession = SessionManager.saveSession(sessionData);
                console.log('Session saved:', savedSession);
                console.log('All sessions after save:', SessionManager.getAllSessions());
                
                // Set performance data to trigger UI update
                setPerformanceData(sessionData);
                console.log('Performance data set:', sessionData);
                
                // Auto-navigate to adaptive difficulty after 3 seconds with countdown
                console.log('Starting 3-second countdown...');
                setCountdown(3);
                
                // Simple countdown with setTimeout
                setTimeout(() => {
                    setCountdown(2);
                    setTimeout(() => {
                        setCountdown(1);
                        setTimeout(() => {
                            console.log('Countdown complete! Navigating to adaptive difficulty...');
                            navigate('/adaptive-difficulty');
                        }, 1000);
                    }, 1000);
                }, 1000);
            }catch(err){
                setError(err.message || "Failed to orchestrate tutoring flow");
            }finally{
                setIsLoading(false);
            }
        }
        if(disability && problem){
            console.log('Both disability and problem exist, starting orchestrate');
            orchestrate();
        } else {
            console.log('Missing required data:');
            console.log('- disability:', disability);
            console.log('- problem:', problem);
            console.log('- id from params:', id);
            console.log('- sessionStorage problem:', sessionStorage.getItem('problem'));
        }
    },[disability,problem])

    function extractFinalAnswer(attempt){
        if(!attempt) return "";
        if(attempt.final_answer) return String(attempt.final_answer).trim();
        if(attempt.answer) return String(attempt.answer).trim();
        // Try last step
        const steps = attempt.steps_to_solve || attempt.steps || [];
        if(Array.isArray(steps) && steps.length > 0){
            const last = String(steps[steps.length - 1] || '').trim();
            const match = last.match(/(?:answer|=|:)?\s*([-+]?[0-9]*\.?[0-9]+)/i);
            if(match) return match[1];
            return last;
        }
        // try thoughtprocess fallback
        if(attempt.thoughtprocess){
            const tp = String(attempt.thoughtprocess);
            const match = tp.match(/(?:answer|=|:)?\s*([-+]?[0-9]*\.?[0-9]+)/i);
            if(match) return match[1];
        }
        return "";
    }

    function normalizeAnswer(ans){
        if(ans == null) return "";
        const s = String(ans).trim().toLowerCase();
        // try to normalize numbers
        const num = Number(s.replace(/[^0-9.-]/g, ''));
        if(!Number.isNaN(num)) return String(num);
        return s;
    }
    return(
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.headerIcon}>💬</div>
                <div>
                    <h2 className={classes.headerTitle}>Tutor Conversation</h2>
                    <p className={classes.headerSubtitle}>
                        Interactive tutoring session with evidence-based strategies
                    </p>
                </div>
            </div>
            
            {isLoading && (
                <div className={classes.loading}>
                    Generating tutoring conversation...
                </div>
            )}
            
            {error && (
                <div className={classes.error}>
                    {error}
                </div>
            )}
            
            {response && !isLoading && (
                <div className={classes.conversationContainer}>
                    {response.conversation && response.conversation.length > 0 && (
                        <div className={classes.conversation}>
                            {response.conversation.map((message, index) => (
                                <div key={index} className={`${classes.message} ${classes[message.speaker.toLowerCase()]}`}>
                                    <div className={classes.messageHeader}>
                                        <span className={classes.speaker}>
                                            {message.speaker === 'Tutor' ? '👨‍🏫' : '👨‍🎓'} {message.speaker}
                                        </span>
                                        {message.strategy && (
                                            <span className={classes.strategy}>
                                                {message.strategy}
                                            </span>
                                        )}
                                    </div>
                                    <div className={classes.messageContent}>
                                        {message.text}
                                    </div>
                                    {message.emotion && (
                                        <div className={classes.emotion}>
                                            Emotion: {message.emotion}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {response.learning_objectives && response.learning_objectives.length > 0 && (
                        <div className={classes.objectivesSection}>
                            <div className={classes.sectionTitle}>🎯 Learning Objectives</div>
                            <ul className={classes.objectivesList}>
                                {response.learning_objectives.map((objective, index) => (
                                    <li key={index} className={classes.objectiveItem}>
                                        {objective}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {response.follow_up_activities && response.follow_up_activities.length > 0 && (
                        <div className={classes.activitiesSection}>
                            <div className={classes.sectionTitle}>📚 Follow-up Activities</div>
                            <ul className={classes.activitiesList}>
                                {response.follow_up_activities.map((activity, index) => (
                                    <li key={index} className={classes.activityItem}>
                                        {activity}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {consistencyResults && (
                        <div className={classes.consistencySection}>
                            <div className={classes.sectionTitle}>🔍 Response Consistency Analysis</div>
                            <div className={classes.consistencyScore}>
                                <div className={classes.scoreLabel}>Overall Consistency Score</div>
                                <div className={`${classes.scoreValue} ${consistencyResults.overall_consistency_score > 0.7 ? classes.highScore : consistencyResults.overall_consistency_score > 0.4 ? classes.mediumScore : classes.lowScore}`}>
                                    {(consistencyResults.overall_consistency_score * 100).toFixed(1)}%
                                </div>
                            </div>
                            
                            <div className={classes.checksGrid}>
                                {Object.entries(consistencyResults.checks || {}).map(([checkName, check]) => (
                                    <div key={checkName} className={classes.checkCard}>
                                        <div className={classes.checkHeader}>
                                            <span className={classes.checkName}>{checkName.replace(/_/g, ' ').toUpperCase()}</span>
                                            <span className={`${classes.checkScore} ${check.score > 0.7 ? classes.highScore : check.score > 0.4 ? classes.mediumScore : classes.lowScore}`}>
                                                {(check.score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className={classes.checkStatus}>{check.status}</div>
                                        <div className={classes.checkDetails}>{check.details}</div>
                                    </div>
                                ))}
                            </div>

                            {consistencyResults.recommendations && consistencyResults.recommendations.length > 0 && (
                                <div className={classes.recommendationsSection}>
                                    <div className={classes.sectionTitle}>💡 Recommendations</div>
                                    <ul className={classes.recommendationsList}>
                                        {consistencyResults.recommendations.map((rec, index) => (
                                            <li key={index} className={classes.recommendationItem}>{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {consistencyResults.flags && consistencyResults.flags.length > 0 && (
                                <div className={classes.flagsSection}>
                                    <div className={classes.sectionTitle}>⚠️ Critical Flags</div>
                                    <ul className={classes.flagsList}>
                                        {consistencyResults.flags.map((flag, index) => (
                                            <li key={index} className={classes.flagItem}>{flag}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {response.test_question && (
                        <div className={classes.section}> 
                            <div className={classes.sectionTitle}>📝 Quick Check</div>
                            <div className={classes.question}>{response.test_question}</div>
                            {testResult && (
                                <>
                                    <div className={classes.badgeRow}>
                                        {passFail && (
                                            <div className={passFail === 'pass' ? classes.passBadge : classes.failBadge}>
                                                {passFail === 'pass' ? '✅ Correct' : '❌ Incorrect'}
                                            </div>
                                        )}
                                    </div>
                                    <div className={classes.quickCheckGrid}>
                                        <div className={classes.answerCard}>
                                            <div className={classes.answerLabel}>Expected</div>
                                            <div className={classes.answerValue}>{testResult.expected || '—'}</div>
                                        </div>
                                        <div className={classes.answerCard}>
                                            <div className={classes.answerLabel}>Student Answer</div>
                                            <div className={classes.answerValue}>{testResult.studentAnswer || '—'}</div>
                                        </div>
                                    </div>
                                    <details className={classes.detailsBlock}>
                                        <summary className={classes.detailsSummary}>View student work</summary>
                                        <div className={classes.studentWork}>
                                            {Array.isArray(testResult.student?.steps_to_solve) && testResult.student.steps_to_solve.length > 0 && (
                                                <div className={classes.stepsList}>
                                                    {testResult.student.steps_to_solve.map((s, i) => (
                                                        <div key={i} className={classes.stepItem}>
                                                            <div className={classes.stepNum}>{i + 1}</div>
                                                            <div className={classes.stepText}>{s}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {testResult.student?.disability_impact && (
                                                <div className={classes.impactBox}>
                                                    <div className={classes.impactTitle}>Notes</div>
                                                    <div className={classes.impactText}>{testResult.student.disability_impact}</div>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Performance Analysis Section */}
            {performanceData && (
                <div className={classes.performanceSection}>
                    <div className={classes.performanceHeader}>
                        <h3>📊 Performance Analysis Complete</h3>
                        <p>Student performance data has been recorded and analyzed.</p>
                        {countdown > 0 && (
                            <div className={classes.countdown}>
                                <div className={classes.countdownText}>
                                    🚀 Redirecting to Adaptive Analysis in {countdown} seconds...
                                </div>
                                <div className={classes.countdownBar}>
                                    <div 
                                        className={classes.countdownProgress}
                                        style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                                    ></div>
                                </div>
                                <div className={classes.countdownNote}>
                                    Or click "View Adaptive Analysis" below to go immediately
                                </div>
                            </div>
                        )}
                    </div>
                    <div className={classes.performanceMetrics}>
                        <div className={classes.metricCard}>
                            <div className={classes.metricLabel}>Consistency Score</div>
                            <div className={classes.metricValue}>
                                {Math.round((performanceData.consistency_score || 0) * 100)}%
                            </div>
                        </div>
                        <div className={classes.metricCard}>
                            <div className={classes.metricLabel}>Correct Answer</div>
                            <div className={classes.metricValue}>
                                {performanceData.is_correct ? '✅ Yes' : '❌ No'}
                            </div>
                        </div>
                        <div className={classes.metricCard}>
                            <div className={classes.metricLabel}>Difficulty</div>
                            <div className={classes.metricValue}>
                                {performanceData.difficulty?.toUpperCase()}
                            </div>
                        </div>
                    </div>
                    <div className={classes.analysisActions}>
                        <button 
                            className={classes.adaptiveBtn}
                            onClick={() => {
                                console.log('Manual navigation to adaptive difficulty...');
                                navigate('/adaptive-difficulty');
                            }}
                        >
                            🎯 View Adaptive Analysis
                        </button>
                        <button 
                            className={classes.newProblemBtn}
                            onClick={() => navigate('/')}
                        >
                            🔄 Generate New Problem
                        </button>
                        
                        {/* Debug button - remove in production */}
                        <button 
                            className={classes.newProblemBtn}
                            onClick={() => {
                                console.log('Debug: Testing navigation...');
                                console.log('Current performance data:', performanceData);
                                console.log('Current countdown:', countdown);
                                navigate('/adaptive-difficulty');
                            }}
                            style={{backgroundColor: '#f59e0b', color: 'white'}}
                        >
                            🐛 Debug: Test Navigation
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}