import classes from "./Thought.module.css";
import ProblemContext from "./ProblemContext";
import WorkflowTabShell from "./WorkflowTabShell";
import AnalysisHeatmap from "./AnalysisHeatmap";
import { useWorkflow } from "../Context/WorkflowProvider";
import { textToBullets } from "../Utils/workflowFormatters";

function InsightCard({ title, bullets, tone = "neutral" }) {
    if (!bullets?.length) return null;
    return (
        <div className={`${classes.insightCard} ${classes[tone]}`}>
            <h3 className={classes.insightTitle}>{title}</h3>
            <ul className={classes.insightList}>
                {bullets.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

function EducatorDetails({ response }) {
    const sections = [
        { key: "cognitive_patterns", label: "Cognitive Patterns" },
        { key: "emotional_indicators", label: "Emotional Indicators" },
        { key: "recommendations", label: "Recommendations" },
    ].filter(({ key }) => response?.[key]);

    if (!sections.length) return null;

    return (
        <details className={classes.educatorDetails}>
            <summary className={classes.educatorSummary}>More detail for educators</summary>
            <div className={classes.educatorContent}>
                {sections.map(({ key, label }) => (
                    <div key={key} className={classes.educatorSection}>
                        <h4>{label}</h4>
                        <ul>
                            {textToBullets(response[key], 6).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </details>
    );
}

export default function Thought() {
    const { results, isLoading, error, metadata } = useWorkflow();
    const response = results?.thought_analysis;
    const checks = results?.consistency_validation?.checks;
    const overallScore = metadata?.consistency_score ?? results?.consistency_validation?.overall_consistency_score;

    return (
        <>
            <ProblemContext />
            <WorkflowTabShell
                title="Thought Analysis"
                subtitle="A quick snapshot of how the student thinks through this problem"
                isLoading={isLoading}
                loadingMessage="Analyzing student's thought process..."
                error={error}
            >
                {response && (
                    <>
                        <AnalysisHeatmap
                            checks={checks}
                            overallScore={overallScore}
                            confidenceLevel={response.confidence_level}
                        />

                        <div className={classes.insightGrid}>
                            <InsightCard
                                title="Strengths"
                                bullets={textToBullets(response.strengths, 3)}
                                tone="good"
                            />
                            <InsightCard
                                title="Needs Work"
                                bullets={textToBullets(response.growth_areas, 3)}
                                tone="warn"
                            />
                            <InsightCard
                                title="Key Mistake"
                                bullets={textToBullets(response.error_analysis, 3)}
                                tone="bad"
                            />
                            <InsightCard
                                title="How Disability Played a Role"
                                bullets={textToBullets(response.disability_impact, 3)}
                                tone="neutral"
                            />
                        </div>

                        <EducatorDetails response={response} />
                    </>
                )}
            </WorkflowTabShell>
        </>
    );
}
