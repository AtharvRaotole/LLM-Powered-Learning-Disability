import { useState } from "react";
import classes from "./DisabilityIdentifierModal.module.css";

export default function DisabilityIdentifierModal({ isOpen, onClose }) {
    const [problem, setProblem] = useState('');
    const [studentResponse, setStudentResponse] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    async function analyzeResponse() {
        if (!problem.trim() || !studentResponse.trim()) {
            setError("Please provide both a problem and student response.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const response = await fetch("http://localhost:8000/api/v1/openai/identify_disability", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    problem: problem,
                    student_response: studentResponse
                })
            });

            if (!response.ok) {
                throw new Error("Failed to analyze student response");
            }

            const jsonResponse = await response.json();
            setAnalysis(jsonResponse);
        } catch (err) {
            console.error("Error:", err);
            setError("Failed to analyze response. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className={classes.overlay}>
            <div className={classes.modal}>
                <div className={classes.header}>
                    <div className={classes.title}>
                        <div className={classes.icon}>🔍</div>
                        Disability Identification Tool
                    </div>
                    <button className={classes.closeBtn} onClick={onClose}>×</button>
                </div>
                
                <div className={classes.content}>
                    <p className={classes.subtitle}>
                        Analyze a student's response to identify potential learning disabilities
                    </p>

                    <div className={classes.inputSection}>
                        <div className={classes.inputGroup}>
                            <label htmlFor="problem" className={classes.label}>
                                Math Problem Given to Student
                            </label>
                            <textarea
                                id="problem"
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                placeholder="Enter the math problem that was given to the student..."
                                className={classes.textarea}
                                rows={4}
                            />
                        </div>

                        <div className={classes.inputGroup}>
                            <label htmlFor="response" className={classes.label}>
                                Student's Response
                            </label>
                            <textarea
                                id="response"
                                value={studentResponse}
                                onChange={(e) => setStudentResponse(e.target.value)}
                                placeholder="Enter the student's complete response, including their work and final answer..."
                                className={classes.textarea}
                                rows={6}
                            />
                        </div>

                        <button 
                            className={classes.analyzeBtn}
                            onClick={analyzeResponse}
                            disabled={isLoading || !problem.trim() || !studentResponse.trim()}
                        >
                            {isLoading ? '⏳' : '🔍'} Analyze Response
                        </button>
                    </div>

                    {isLoading && (
                        <div className={classes.loading}>
                            Analyzing student response for potential learning disabilities...
                        </div>
                    )}

                    {error && (
                        <div className={classes.error}>
                            {error}
                        </div>
                    )}

                    {analysis && !isLoading && (
                        <div className={classes.results}>
                            <h3 className={classes.resultsTitle}>Analysis Results</h3>
                            
                            {analysis.potential_disabilities && analysis.potential_disabilities.length > 0 && (
                                <div className={classes.section}>
                                    <h4 className={classes.sectionTitle}>Potential Learning Disabilities</h4>
                                    {analysis.potential_disabilities.map((disability, index) => (
                                        <div key={index} className={classes.disabilityCard}>
                                            <div className={classes.disabilityHeader}>
                                                <span className={classes.disabilityName}>{disability.disability}</span>
                                                <span className={`${classes.confidence} ${classes[disability.confidence]}`}>
                                                    {disability.confidence} confidence
                                                </span>
                                            </div>
                                            <div className={classes.indicators}>
                                                <strong>Indicators:</strong>
                                                <ul>
                                                    {disability.indicators.map((indicator, idx) => (
                                                        <li key={idx}>{indicator}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className={classes.explanation}>
                                                <strong>Explanation:</strong> {disability.explanation}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {analysis.error_patterns && analysis.error_patterns.length > 0 && (
                                <div className={classes.section}>
                                    <h4 className={classes.sectionTitle}>Error Patterns Observed</h4>
                                    <ul className={classes.patternList}>
                                        {analysis.error_patterns.map((pattern, index) => (
                                            <li key={index} className={classes.patternItem}>{pattern}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {analysis.strengths_observed && analysis.strengths_observed.length > 0 && (
                                <div className={classes.section}>
                                    <h4 className={classes.sectionTitle}>Strengths Observed</h4>
                                    <ul className={classes.strengthsList}>
                                        {analysis.strengths_observed.map((strength, index) => (
                                            <li key={index} className={classes.strengthItem}>{strength}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {analysis.recommendations && analysis.recommendations.length > 0 && (
                                <div className={classes.section}>
                                    <h4 className={classes.sectionTitle}>Recommendations</h4>
                                    <ul className={classes.recommendationsList}>
                                        {analysis.recommendations.map((recommendation, index) => (
                                            <li key={index} className={classes.recommendationItem}>{recommendation}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {analysis.professional_consultation && (
                                <div className={classes.section}>
                                    <h4 className={classes.sectionTitle}>Professional Consultation</h4>
                                    <div className={classes.consultationNote}>
                                        {analysis.professional_consultation}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
