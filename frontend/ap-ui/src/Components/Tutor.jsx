import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DisabilitiesEnum from "../Store/Disabilities";
import classes from "./Tutor.module.css";
import SessionManager from "../Utils/SessionManager";
import { getOrRunFullWorkflow } from "../Utils/langgraphApi";
import ProblemContext from "./ProblemContext";

export default function Tutor(){
    const {id}=useParams();
    const disability=DisabilitiesEnum[id];
    const problem=sessionStorage.getItem('problem');
    const problemJsonRaw = sessionStorage.getItem('problem_json');
    const problemObj = (() => { try { return problemJsonRaw ? JSON.parse(problemJsonRaw) : null; } catch { return null; } })();
    const gradeLevel = sessionStorage.getItem('gradeLevel') || '7th';
    const difficulty = sessionStorage.getItem('difficulty') || 'medium';

    const[response,setResponse]=useState(null);
    const[testResult,setTestResult]=useState(null);
    const[passFail,setPassFail]=useState(null);
    const[quickCheckPassed,setQuickCheckPassed]=useState(null);
    const[consistencyResults,setConsistencyResults]=useState(null);
    const[isLoading,setIsLoading]=useState(true);
    const[error,setError]=useState(null);

    useEffect(()=>{
        async function fetchLegacyAttempt(currentDisability, question) {
            const response = await fetch("http://localhost:8000/api/v1/openai/generate_attempt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    disability: currentDisability,
                    problem: question,
                }),
            });
            if (!response.ok) {
                throw new Error(`Legacy attempt failed (${response.status})`);
            }
            return response.json();
        }

        async function fetchLegacyTutor(currentDisability, studentAttempt, thoughtAnalysis) {
            const response = await fetch("http://localhost:8000/api/v1/openai/generate_tutor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    disability: currentDisability,
                    problem,
                    student_attempt: JSON.stringify(studentAttempt),
                    thought_analysis: JSON.stringify(thoughtAnalysis || {}),
                }),
            });
            if (!response.ok) {
                throw new Error(`Legacy tutor failed (${response.status})`);
            }
            return response.json();
        }

        async function orchestrate(){
            if (!disability || !problem) {
                setIsLoading(false);
                setError("Please generate a problem and select a disability to start the tutor session.");
                return;
            }
            setIsLoading(true);
            setError(null);
            try{
                const payload = {
                    grade_level: gradeLevel,
                    difficulty,
                    disability,
                    // Pass the full problem object when available so the
                    // backend can access the canonical expected answer.
                    problem: problemObj || problem,
                    metadata: {
                        // Bias simulation correctness based on recent performance
                        // (fallback to balanced if insufficient data)
                        target_correctness: estimateTargetCorrectness(),
                    },
                };

                // Force refresh so target correctness bias applies and we avoid
                // returning cached simulations that ignore new metadata.
                let analysis = await getOrRunFullWorkflow(payload, { forceRefresh: true });
                let studentAttempt = analysis?.results?.student_simulation;
                let thoughtAnalysis = analysis?.results?.thought_analysis;
                let tutorSession = analysis?.results?.tutor_session;
                let consistency = analysis?.results?.consistency_validation || analysis?.results?.consistency_report;

                if (!studentAttempt || !tutorSession) {
                    analysis = await getOrRunFullWorkflow(payload, { forceRefresh: true });
                    studentAttempt = analysis?.results?.student_simulation;
                    thoughtAnalysis = analysis?.results?.thought_analysis;
                    tutorSession = analysis?.results?.tutor_session;
                    consistency = analysis?.results?.consistency_validation || analysis?.results?.consistency_report;
                }

                if (!studentAttempt || !tutorSession) {
                    studentAttempt = studentAttempt || (await fetchLegacyAttempt(disability, problem));
                    thoughtAnalysis = thoughtAnalysis || null;
                    tutorSession = await fetchLegacyTutor(disability, studentAttempt, thoughtAnalysis);
                }

                if (!tutorSession) {
                    throw new Error("Tutor session data missing from LangGraph response");
                }

                setResponse(tutorSession);
                setConsistencyResults(consistency || null);

                let testAttemptJson = null;
                let passed = false;

                if (tutorSession.test_question) {
                    const testPayload = {
                        grade_level: gradeLevel,
                        difficulty,
                        disability,
                        problem: tutorSession.test_question,
                    };
                    let testAnalysis = await getOrRunFullWorkflow(testPayload);
                    testAttemptJson = testAnalysis?.results?.student_simulation || null;

                    if (!testAttemptJson) {
                        testAnalysis = await getOrRunFullWorkflow(testPayload, { forceRefresh: true });
                        testAttemptJson = testAnalysis?.results?.student_simulation || null;
                    }

                    if (!testAttemptJson) {
                        testAttemptJson = await fetchLegacyAttempt(disability, tutorSession.test_question);
                    }
                    const studentAnswer = extractFinalAnswer(testAttemptJson);
                    const expectedAnswer = (tutorSession.expected_answer || "").toString().trim();
                    const quickPass = compareAnswers(studentAnswer, expectedAnswer) && expectedAnswer !== "";
                    setQuickCheckPassed(quickPass);
                    setTestResult({
                        question: tutorSession.test_question,
                        expected: expectedAnswer,
                        student: testAttemptJson,
                        studentAnswer,
                    });
                }

                // Compute correctness vs original problem (base session correctness on original attempt only)
                const originalExpected = (problemObj && problemObj.answer) ? String(problemObj.answer) : (sessionStorage.getItem('answer') || "");
                const studentFinal = extractFinalAnswer(studentAttempt);
                const originalCorrect = originalExpected ? compareAnswers(studentFinal, originalExpected) : false;
                setPassFail(originalCorrect ? 'pass' : 'fail');

                SessionManager.saveSession({
                    difficulty,
                    gradeLevel,
                    disability,
                    // Use binary consistency_score derived from original correctness (no percentage calc)
                    consistency_score: originalCorrect ? 1 : 0,
                    // Session correctness derives from original attempt only
                    is_correct: originalCorrect,
                    is_correct_quickcheck: typeof quickCheckPassed === 'boolean' ? quickCheckPassed : null,
                    is_correct_original: originalCorrect,
                    student_final_answer: studentFinal,
                    expected_answer: originalExpected || (tutorSession?.expected_answer || ""),
                    problem,
                    duration: Math.floor(Math.random() * 300) + 60,
                    timestamp: Date.now(),
                    student_attempt: studentAttempt,
                    diagnosis: thoughtAnalysis,
                    tutor_response: tutorSession,
                    test_attempt: testAttemptJson,
                    consistency_results: consistency,
                    consistencyResults: consistency,
                    has_test_question: Boolean(tutorSession.test_question),
                    cache_status: analysis?.metadata?.cache_status || {},
                });

                // Removed auto-navigation countdown; user can continue manually
            } catch(err) {
                console.error('Tutor orchestration error:', err);
                setError(err.message || "Failed to run tutor workflow.");
            } finally {
                setIsLoading(false);
            }
        }

        orchestrate();
    }, [gradeLevel, difficulty, disability, problem]);

    return(
        <div className={classes.container}>
            <ProblemContext />
            <div className={classes.header}>
                <div className={classes.headerIcon}>🗣️</div>
                <div>
                    <h2 className={classes.headerTitle}>Adaptive Tutor Session</h2>
                    <p className={classes.headerSubtitle}>
                        Personalized guidance based on the student's needs and response patterns
                    </p>
                </div>
            </div>

            {isLoading && (
                <div className={classes.loading}>
                    Guiding the tutoring session...
                </div>
            )}

            {error && (
                <div className={classes.error}>
                    {error}
                </div>
            )}

            {response && !isLoading && (
                <div className={classes.content}>
                    <div className={classes.conversationContainer}>
                        <div className={classes.conversationHeader}>
                            <span className={classes.conversationIcon}>💬</span>
                            <span className={classes.conversationTitle}>Tutoring Conversation</span>
                        </div>
                        <div className={classes.conversation}>
                            {response.conversation?.map((turn, index) => (
                                <div key={index} className={
                                    turn.speaker === "Tutor" ? classes.tutorTurn : classes.studentTurn
                                }>
                                    <div className={classes.speakerAvatar}>
                                        {turn.speaker === "Tutor" ? "👨‍🏫" : "👨‍🎓"}
                                    </div>
                                    <div className={classes.messageContent}>
                                        <div className={classes.speakerName}>{turn.speaker}</div>
                                        <div className={classes.messageText}>{turn.text}</div>
                                        <div className={classes.messageMeta}>
                                            {turn.strategy && (
                                                <span className={classes.strategyTag}>
                                                    <span className={classes.tagIcon}>🎯</span>
                                                    {turn.strategy}
                                                </span>
                                            )}
                                            {turn.emotion && (
                                                <span className={classes.emotionTag}>
                                                    <span className={classes.tagIcon}>{getEmotionEmoji(turn.emotion)}</span>
                                                    {turn.emotion}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {response.learning_objectives && (
                        <div className={classes.section}>
                            <div className={classes.sectionTitle}>🎯 Learning Objectives</div>
                            <ul className={classes.objectiveList}>
                                {response.learning_objectives.map((objective, index) => (
                                    <li key={index}>{objective}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {response.follow_up_activities && (
                        <div className={classes.section}>
                            <div className={classes.sectionTitle}>📘 Follow-up Activities</div>
                            <ul className={classes.activityList}>
                                {response.follow_up_activities.map((activity, index) => (
                                    <li key={index}>{activity}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {response.test_question && (
                        <div className={classes.section}>
                            <div className={classes.sectionTitle}>📏 Quick Check</div>
                            <div className={classes.testQuestion}>{response.test_question}</div>
                            <div className={classes.expectedAnswer}>
                                Expected Answer: {response.expected_answer}
                            </div>
                            {testResult && (
                                <div className={classes.testResult}>
                                    <div>Student Attempt: {testResult.studentAnswer || 'N/A'}</div>
                                    <div>
                                        Result: {quickCheckPassed ? '✅ Mastered' : '❌ Needs Review'}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Removed consistency percentage display; correctness is based on original attempt */}

                    {passFail && (
                        <div className={classes.summaryCard}>
                            <div className={classes.summaryTitle}>Session Summary</div>
                            <div className={classes.summaryStatus}>
                                {passFail === 'pass' ? '🎉 Student demonstrated mastery!' : '🔄 Additional support recommended.'}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function extractFinalAnswer(attempt) {
    if (!attempt) return "";
    if (attempt.final_answer) return String(attempt.final_answer).trim();
    if (attempt.answer) return String(attempt.answer).trim();
    if (attempt.steps_to_solve && attempt.steps_to_solve.length > 0) {
        const last = attempt.steps_to_solve[attempt.steps_to_solve.length - 1];
        return String(last).trim();
    }
    return "";
}

function parseFraction(s) {
    const m = String(s).trim().match(/^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/);
    if (!m) return null;
    const num = parseFloat(m[1]);
    const den = parseFloat(m[2]);
    if (Number.isNaN(num) || Number.isNaN(den) || den === 0) return null;
    return num / den;
}

function parsePercent(s) {
    const str = String(s).trim();
    if (!str.endsWith('%')) return null;
    const v = Number(str.slice(0, -1).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(v)) return null;
    return v / 100;
}

function parseNumericLike(s) {
    if (s == null) return null;
    const frac = parseFraction(s);
    if (frac != null) return frac;
    const perc = parsePercent(s);
    if (perc != null) return perc;
    const num = Number(String(s).replace(/[^0-9.-]/g, ''));
    return Number.isNaN(num) ? null : num;
}

function compareAnswers(a, b) {
    if (a == null || b == null) return false;
    const an = parseNumericLike(a);
    const bn = parseNumericLike(b);
    if (an != null && bn != null) {
        const tol = Math.max(1e-6, 0.005 * Math.abs(bn)); // 0.5% or epsilon
        return Math.abs(an - bn) <= tol;
    }
    // Fallback to case-insensitive trimmed comparison
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function estimateTargetCorrectness() {
    try {
        const sessions = SessionManager.getAllSessions();
        const recent = sessions.slice(0, 6);
        if (recent.length < 2) return 'balanced';
        const passRate = recent.filter(s => s.is_correct === true).length / recent.length;
        if (passRate >= 0.7) return 'likely_correct';
        if (passRate <= 0.4) return 'likely_incorrect';
        return 'balanced';
    } catch {
        return 'balanced';
    }
}

function getEmotionEmoji(emotion) {
    const emotionLower = (emotion || '').toLowerCase();
    
    // Map emotions to appropriate emojis
    if (emotionLower.includes('anxious') || emotionLower.includes('nervous') || emotionLower.includes('worried')) {
        return '😰';
    }
    if (emotionLower.includes('confused') || emotionLower.includes('unsure')) {
        return '😕';
    }
    if (emotionLower.includes('frustrated') || emotionLower.includes('angry')) {
        return '😤';
    }
    if (emotionLower.includes('happy') || emotionLower.includes('excited') || emotionLower.includes('joyful')) {
        return '😊';
    }
    if (emotionLower.includes('confident') || emotionLower.includes('proud')) {
        return '😎';
    }
    if (emotionLower.includes('tentative') || emotionLower.includes('cautious')) {
        return '🤔';
    }
    if (emotionLower.includes('relieved') || emotionLower.includes('calm')) {
        return '😌';
    }
    if (emotionLower.includes('determined') || emotionLower.includes('focused')) {
        return '💪';
    }
    if (emotionLower.includes('sad') || emotionLower.includes('disappointed')) {
        return '😞';
    }
    if (emotionLower.includes('surprised') || emotionLower.includes('shocked')) {
        return '😮';
    }
    
    // Default emoji for unknown emotions
    return '💭';
}
