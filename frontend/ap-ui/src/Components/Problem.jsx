import { useEffect, useContext, useState } from "react";
import UserContext from "../Store/UserContext";
import classes from "./Problem.module.css";
import { generateLangGraphProblem } from "../Utils/langgraphApi";
import { prewarmAfterProblem } from "../Context/WorkflowProvider";
import { persistProblem, getProblemObject, getSelectedDisabilityName } from "../Utils/workflowSession";
import GradeDifficultyControls from "./GradeDifficultyControls";
import {
    DEFAULT_DIFFICULTY,
    DEFAULT_GRADE_LEVEL,
    getDifficultyLabel,
    getGradeLabel,
    persistGradeAndDifficulty,
    readStoredDifficulty,
    readStoredGradeLevel,
} from "../Utils/gradeConfig";

export default function Problem(){
    const userCtx = useContext(UserContext);
    const [problem, setProblem] = useState('');
    const [answer, setAnswer] = useState('');
    const [approach, setApproach] = useState('');
    const [gradeLevel, setGradeLevel] = useState(() => readStoredGradeLevel() || DEFAULT_GRADE_LEVEL);
    const [selectedDifficulty, setSelectedDifficulty] = useState(() => readStoredDifficulty() || DEFAULT_DIFFICULTY);
    const [concepts, setConcepts] = useState([]);
    const [difficulty, setDifficulty] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPrewarming, setIsPrewarming] = useState(false);
    const [error, setError] = useState(null);
    const [answerValidated, setAnswerValidated] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [showSolution, setShowSolution] = useState(false);

    useEffect(() => {
        const stored = getProblemObject();
        if (stored?.problem) {
            hydrateFromStorage(stored);
        } else {
            generateProblem();
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        persistGradeAndDifficulty(gradeLevel, selectedDifficulty);
    }, [gradeLevel, selectedDifficulty]);

    function hydrateFromStorage(stored) {
        userCtx.setGeneratedProblem(stored.problem);
        userCtx.setAnswer(stored.answer || "");
        userCtx.setApproach(stored.solution || "");

        setProblem(stored.problem);
        setAnswer(stored.answer || "");
        setApproach(stored.solution || "");
        setConcepts(stored.concepts || []);
        setDifficulty(stored.difficulty || "");
        setAnswerValidated(Boolean(stored.answer_validated));
    }

    async function generateProblem(){
        setIsLoading(true);
        setError(null);
        setShowAnswer(false);
        setShowSolution(false);
        try{
            const problemData = await generateLangGraphProblem({
                grade_level: gradeLevel,
                difficulty: selectedDifficulty,
            });

            if (!problemData || !problemData.problem) {
                throw new Error("Problem generation returned empty data");
            }

            const canonical = persistProblem({
                ...problemData,
                grade_level: gradeLevel,
                difficulty: problemData.difficulty || selectedDifficulty,
                answer_validated: Boolean(
                    problemData.answer_validated ?? problemData.metadata?.answer_validated
                ),
            });

            userCtx.setGeneratedProblem(canonical.problem);
            userCtx.setAnswer(canonical.answer);
            userCtx.setApproach(canonical.solution);

            setProblem(canonical.problem);
            setAnswer(canonical.answer);
            setApproach(canonical.solution);
            setConcepts(problemData.concepts || []);
            setDifficulty(canonical.difficulty || selectedDifficulty);
            setAnswerValidated(Boolean(canonical.answer_validated));

            const selectedDisability = getSelectedDisabilityName();
            if (selectedDisability) {
                setIsPrewarming(true);
                prewarmAfterProblem(selectedDisability)
                    .catch((err) => console.warn("Prewarm failed:", err))
                    .finally(() => setIsPrewarming(false));
            }
        } catch(error) {
            setError(`Failed to generate problem: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    return(
        <div className={classes.page}>
            <header className={classes.header}>
                <h1 className={classes.largeTitle}>Problem Generator</h1>
                <p className={classes.subtitle}>
                    Generate a math problem, then explore how different learning disabilities affect problem-solving.
                </p>
            </header>

            <section className={classes.controlsCard}>
                <GradeDifficultyControls
                    gradeLevel={gradeLevel}
                    difficulty={selectedDifficulty}
                    onGradeChange={setGradeLevel}
                    onDifficultyChange={setSelectedDifficulty}
                />
                <button
                    className={classes.generateBtn}
                    onClick={generateProblem}
                    disabled={isLoading}
                >
                    {isLoading ? 'Generating…' : 'Generate New Problem'}
                </button>
            </section>

            {isLoading && (
                <div className={classes.statusBanner}>
                    <span className={classes.spinner} aria-hidden="true" />
                    Generating a new math problem…
                </div>
            )}

            {error && (
                <div className={classes.errorBanner} role="alert">
                    {error}
                </div>
            )}

            {isPrewarming && (
                <div className={classes.statusBanner}>
                    <span className={classes.spinner} aria-hidden="true" />
                    Preparing simulation cache…
                </div>
            )}

            {!isLoading && problem && (
                <div className={classes.groupedList}>
                    <section className={classes.group}>
                        <div className={classes.groupHeader}>Problem Statement</div>
                        <div className={classes.groupCell}>
                            <p className={classes.problemText}>{problem}</p>
                            <div className={classes.metaRow}>
                                <span className={classes.metaChip}>{getGradeLabel(gradeLevel)}</span>
                                {difficulty && (
                                    <span className={classes.metaChip}>{getDifficultyLabel(difficulty)}</span>
                                )}
                                {answerValidated && (
                                    <span className={`${classes.metaChip} ${classes.metaChipVerified}`}>Verified</span>
                                )}
                            </div>
                        </div>
                    </section>

                    {concepts.length > 0 && (
                        <section className={classes.group}>
                            <div className={classes.groupHeader}>Concepts</div>
                            <div className={classes.groupCell}>
                                <div className={classes.conceptTags}>
                                    {concepts.map((concept, index) => (
                                        <span key={index} className={classes.conceptTag}>{concept}</span>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    <section className={classes.group}>
                        <button
                            type="button"
                            className={classes.disclosureRow}
                            onClick={() => setShowAnswer(!showAnswer)}
                            aria-expanded={showAnswer}
                        >
                            <span>Correct Answer</span>
                            <span className={classes.disclosureChevron}>{showAnswer ? '−' : '+'}</span>
                        </button>
                        {showAnswer && (
                            <div className={classes.disclosureContent}>{answer}</div>
                        )}
                    </section>

                    <section className={classes.group}>
                        <button
                            type="button"
                            className={classes.disclosureRow}
                            onClick={() => setShowSolution(!showSolution)}
                            aria-expanded={showSolution}
                        >
                            <span>Solution Approach</span>
                            <span className={classes.disclosureChevron}>{showSolution ? '−' : '+'}</span>
                        </button>
                        {showSolution && (
                            <div className={classes.disclosureContent}>
                                {approach.split('\n').map((step, index) => {
                                    const cleanStep = step.trim();
                                    if (!cleanStep) return null;
                                    return (
                                        <div key={index} className={classes.solutionStep}>
                                            <span className={classes.stepNum}>{index + 1}</span>
                                            <span>{cleanStep.replace(/^\d+\.\s*/, '').replace(/^Step \d+:\s*/i, '')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}
