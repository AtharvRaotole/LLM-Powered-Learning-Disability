import { useEffect, useContext, useState } from "react"
import UserContext from "../Store/UserContext";
import classes from "./Problem.module.css"

export default function Problem(){
    const userCtx = useContext(UserContext);
    const [problem, setProblem] = useState('');
    const [answer, setAnswer] = useState('');
    const [approach, setApproach] = useState('');
    const [gradeLevel, setGradeLevel] = useState('7th');
    const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
    const [concepts, setConcepts] = useState([]);
    const [difficulty, setDifficulty] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        generateProblem();
    }, [])

    async function generateProblem(){
        setIsLoading(true);
        setError(null);
        console.log("Generating problem for grade level:", gradeLevel, "difficulty:", selectedDifficulty);
        try{
            const url = `http://localhost:8000/api/v1/openai/generate_problem?grade_level=${gradeLevel}&difficulty=${selectedDifficulty}`;
            console.log("Making request to:", url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);
            
            if(!response.ok){
                const errorText = await response.text();
                console.error("Response error:", errorText);
                throw new Error(`Failed to generate problem: ${response.status} ${response.statusText}`);
            }
            
            const jsonResponse = await response.json();
            console.log("Response data:", jsonResponse);
            
            userCtx.setGeneratedProblem(jsonResponse.problem);
            userCtx.setAnswer(jsonResponse.answer);
            userCtx.setApproach(jsonResponse.solution);
            
            sessionStorage.setItem("problem", jsonResponse.problem);
            sessionStorage.setItem("answer", jsonResponse.answer);
            sessionStorage.setItem("approach", jsonResponse.solution);
            
            setProblem(jsonResponse.problem);
            setAnswer(jsonResponse.answer);
            setApproach(jsonResponse.solution);
            setConcepts(jsonResponse.concepts || []);
            setDifficulty(jsonResponse.difficulty || '');
        } catch(error) {
            console.error("Error while generating problem:", error);
            setError(`Failed to generate problem: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    return(
        <div className={classes.problemContainer}>
            <div className={classes.header}>
                <div className={classes.title}>
                    <div className={classes.icon}>📚</div>
                    Math Problem Generator
                </div>
                <div className={classes.controls}>
                    <div className={classes.gradeSelector}>
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
                    <div className={classes.gradeSelector}>
                        <label htmlFor="difficulty">Difficulty:</label>
                        <select 
                            id="difficulty"
                            value={selectedDifficulty} 
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className={classes.select}
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                    <button 
                        className={classes.refreshBtn} 
                        onClick={generateProblem}
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳' : '🔄'} Generate New Problem
                    </button>
                </div>
            </div>
            
            {isLoading && (
                <div className={classes.loading}>
                    Generating a new math problem...
                </div>
            )}
            
            {error && (
                <div className={classes.error}>
                    {error}
                </div>
            )}
            
            {!isLoading && problem && (
                <>
                    <div className={classes.section}>
                        <div className={classes.sectionTitle}>Problem Statement</div>
                        <div className={classes.sectionContent}>{problem}</div>
                        <div className={classes.metaInfo}>
                            <span className={classes.gradeLevel}>Grade: {gradeLevel}</span>
                            {difficulty && <span className={classes.difficulty}>Difficulty: {difficulty}</span>}
                        </div>
                    </div>
                    
                    {concepts.length > 0 && (
                        <div className={classes.section}>
                            <div className={classes.sectionTitle}>Math Concepts</div>
                            <div className={classes.conceptsList}>
                                {concepts.map((concept, index) => (
                                    <span key={index} className={classes.conceptTag}>
                                        {concept}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className={classes.section}>
                        <div className={classes.sectionTitle}>Correct Answer</div>
                        <div className={classes.sectionContent}>{answer}</div>
                    </div>
                    
                    <div className={classes.section}>
                        <div className={classes.sectionTitle}>Solution Approach</div>
                        <div className={classes.solutionSteps}>
                            {approach.split('\n').map((step, index) => {
                                // Clean up the step and check if it's a numbered step
                                const cleanStep = step.trim();
                                if (cleanStep && (cleanStep.match(/^\d+\./) || cleanStep.match(/^Step \d+/i))) {
                                    return (
                                        <div key={index} className={classes.step}>
                                            <div className={classes.stepNumber}>{index + 1}</div>
                                            <div className={classes.stepContent}>
                                                {cleanStep.replace(/^\d+\.\s*/, '').replace(/^Step \d+:\s*/i, '')}
                                            </div>
                                        </div>
                                    );
                                } else if (cleanStep) {
                                    return (
                                        <div key={index} className={classes.step}>
                                            <div className={classes.stepNumber}>{index + 1}</div>
                                            <div className={classes.stepContent}>{cleanStep}</div>
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}