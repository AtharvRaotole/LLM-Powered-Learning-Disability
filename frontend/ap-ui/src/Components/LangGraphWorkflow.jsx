import { useState, useEffect } from "react";
import classes from "./LangGraphWorkflow.module.css";

export default function LangGraphWorkflow() {
    const [workflowData, setWorkflowData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState("");

    // Form state
    const [gradeLevel, setGradeLevel] = useState("7th");
    const [difficulty, setDifficulty] = useState("medium");
    const [disability, setDisability] = useState("Dyslexia");
    const [workflowType, setWorkflowType] = useState("full");

    const disabilities = [
        "Dyslexia",
        "Dysgraphia", 
        "Dyscalculia",
        "Attention Deficit Hyperactivity Disorder",
        "Auditory Processing Disorder",
        "Non verbal Learning Disorder",
        "Language Processing Disorder"
    ];

    const workflowTypes = [
        { value: "problem_only", label: "Generate Problem Only" },
        { value: "full", label: "Full Student Simulation" },
        { value: "analysis_only", label: "Analysis Only" }
    ];

    async function runWorkflow() {
        setIsLoading(true);
        setError(null);
        setWorkflowData(null);
        setCurrentStep("Starting workflow...");

        try {
            const response = await fetch('http://localhost:8000/api/v2/langgraph/full-workflow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grade_level: gradeLevel,
                    difficulty: difficulty,
                    disability: disability,
                    workflow_type: workflowType,
                    metadata: workflowType === "problem_only" ? { refresh_problem: true } : undefined
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Workflow result:', data);
            
            setWorkflowData(data);
            setCurrentStep(data.current_step || "completed");
            
        } catch (err) {
            console.error('Error running workflow:', err);
            setError(`Failed to run workflow: ${err.message}`);
            setCurrentStep("error");
        } finally {
            setIsLoading(false);
        }
    }

    async function generateProblemOnly() {
        setIsLoading(true);
        setError(null);
        setWorkflowData(null);
        setCurrentStep("Generating problem...");

        try {
            const response = await fetch('http://localhost:8000/api/v2/langgraph/generate-problem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grade_level: gradeLevel,
                    difficulty: difficulty,
                    workflow_type: "problem_only",
                    metadata: { refresh_problem: true }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Problem generated:', data);
            
            setWorkflowData({ results: { generated_problem: data } });
            setCurrentStep("problem_generated");
            
        } catch (err) {
            console.error('Error generating problem:', err);
            setError(`Failed to generate problem: ${err.message}`);
            setCurrentStep("error");
        } finally {
            setIsLoading(false);
        }
    }

    function getStepIcon(step) {
        const stepIcons = {
            "initialized": "🚀",
            "problem_generated": "📚",
            "student_simulated": "👤",
            "thought_analyzed": "🧠",
            "strategies_generated": "💡",
            "tutor_simulated": "👨‍🏫",
            "consistency_validated": "✅",
            "adaptive_analyzed": "🎯",
            "completed": "🎉",
            "error": "❌"
        };
        return stepIcons[step] || "⏳";
    }

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.title}>
                    <div className={classes.icon}>🔄</div>
                    LangGraph Workflow Demo
                </div>
                <p className={classes.subtitle}>
                    Unified AI workflow for learning disability simulation
                </p>
            </div>

            {/* Controls */}
            <div className={classes.controls}>
                <div className={classes.controlGroup}>
                    <label htmlFor="gradeLevel">Grade Level:</label>
                    <select 
                        id="gradeLevel"
                        value={gradeLevel} 
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className={classes.select}
                    >
                        <option value="2nd">2nd Grade</option>
                        <option value="5th">5th Grade</option>
                        <option value="7th">7th Grade</option>
                    </select>
                </div>

                <div className={classes.controlGroup}>
                    <label htmlFor="difficulty">Difficulty:</label>
                    <select 
                        id="difficulty"
                        value={difficulty} 
                        onChange={(e) => setDifficulty(e.target.value)}
                        className={classes.select}
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                <div className={classes.controlGroup}>
                    <label htmlFor="disability">Disability:</label>
                    <select 
                        id="disability"
                        value={disability} 
                        onChange={(e) => setDisability(e.target.value)}
                        className={classes.select}
                    >
                        {disabilities.map(dis => (
                            <option key={dis} value={dis}>{dis}</option>
                        ))}
                    </select>
                </div>

                <div className={classes.controlGroup}>
                    <label htmlFor="workflowType">Workflow Type:</label>
                    <select 
                        id="workflowType"
                        value={workflowType} 
                        onChange={(e) => setWorkflowType(e.target.value)}
                        className={classes.select}
                    >
                        {workflowTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Action Buttons */}
            <div className={classes.actions}>
                <button 
                    className={classes.primaryBtn}
                    onClick={runWorkflow}
                    disabled={isLoading}
                >
                    {isLoading ? '⏳' : '🔄'} Run Full Workflow
                </button>
                
                <button 
                    className={classes.secondaryBtn}
                    onClick={generateProblemOnly}
                    disabled={isLoading}
                >
                    {isLoading ? '⏳' : '📚'} Generate Problem Only
                </button>
            </div>

            {/* Status */}
            {isLoading && (
                <div className={classes.status}>
                    <div className={classes.statusIcon}>{getStepIcon(currentStep)}</div>
                    <div className={classes.statusText}>{currentStep}</div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className={classes.error}>
                    <div className={classes.errorIcon}>❌</div>
                    <div className={classes.errorText}>{error}</div>
                </div>
            )}

            {/* Results Display */}
            {workflowData && !isLoading && (
                <div className={classes.results}>
                    <h3 className={classes.resultsTitle}>Workflow Results</h3>
                    
                    {/* Generated Problem */}
                    {workflowData.results?.generated_problem && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>📚 Generated Problem</h4>
                            <div className={classes.problemContent}>
                                <div className={classes.problemText}>
                                    {workflowData.results.generated_problem.problem}
                                </div>
                                <div className={classes.problemMeta}>
                                    <span className={classes.metaTag}>
                                        Grade: {workflowData.results.generated_problem.grade_level}
                                    </span>
                                    <span className={classes.metaTag}>
                                        Difficulty: {workflowData.results.generated_problem.difficulty}
                                    </span>
                                </div>
                                <details className={classes.solutionDetails}>
                                    <summary>View Solution</summary>
                                    <div className={classes.solutionContent}>
                                        <strong>Answer:</strong> {workflowData.results.generated_problem.answer}
                                        <br />
                                        <strong>Solution:</strong> {workflowData.results.generated_problem.solution}
                                    </div>
                                </details>
                            </div>
                        </div>
                    )}

                    {/* Student Simulation */}
                    {workflowData.results?.student_simulation && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>👤 Student Simulation</h4>
                            <div className={classes.simulationContent}>
                                <div className={classes.thoughtProcess}>
                                    <strong>Thought Process:</strong>
                                    <p>{workflowData.results.student_simulation.thoughtprocess}</p>
                                </div>
                                <div className={classes.steps}>
                                    <strong>Steps to Solve:</strong>
                                    <ol>
                                        {workflowData.results.student_simulation.steps_to_solve?.map((step, index) => (
                                            <li key={index}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                                <div className={classes.disabilityImpact}>
                                    <strong>Disability Impact:</strong>
                                    <p>{workflowData.results.student_simulation.disability_impact}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Thought Analysis */}
                    {workflowData.results?.thought_analysis && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>🧠 Thought Analysis</h4>
                            <div className={classes.analysisContent}>
                                <div className={classes.analysisText}>
                                    {workflowData.results.thought_analysis.thought}
                                </div>
                                <div className={classes.mistakeAnalysis}>
                                    <strong>Mistake Analysis:</strong>
                                    <ul>
                                        <li>Type: {workflowData.results.thought_analysis.mistake_analysis?.type}</li>
                                        <li>Severity: {workflowData.results.thought_analysis.mistake_analysis?.severity}</li>
                                        <li>Frequency: {workflowData.results.thought_analysis.mistake_analysis?.frequency}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Teaching Strategies */}
                    {workflowData.results?.teaching_strategies && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>💡 Teaching Strategies</h4>
                            <div className={classes.strategiesContent}>
                                <div className={classes.strategyGroup}>
                                    <strong>Immediate Strategies:</strong>
                                    <ul>
                                        {workflowData.results.teaching_strategies.immediate_strategies?.map((strategy, index) => (
                                            <li key={index}>{strategy}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={classes.strategyGroup}>
                                    <strong>Accommodations:</strong>
                                    <ul>
                                        {workflowData.results.teaching_strategies.accommodations?.map((accommodation, index) => (
                                            <li key={index}>{accommodation}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Consistency Validation */}
                    {workflowData.results?.consistency_validation && (
                        <div className={classes.section}>
                            <h4 className={classes.sectionTitle}>✅ Consistency Validation</h4>
                            <div className={classes.validationContent}>
                                <div className={classes.validationScore}>
                                    <strong>Overall Consistency Score:</strong> 
                                    {(workflowData.results.consistency_validation.overall_consistency_score * 100).toFixed(1)}%
                                </div>
                                {workflowData.results.consistency_validation.recommendations && (
                                    <div className={classes.recommendations}>
                                        <strong>Recommendations:</strong>
                                        <ul>
                                            {workflowData.results.consistency_validation.recommendations.map((rec, index) => (
                                                <li key={index}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
