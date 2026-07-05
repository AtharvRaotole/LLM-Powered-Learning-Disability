import { useState } from "react";
import classes from "./Strategies.module.css";
import ProblemContext from "./ProblemContext";
import WorkflowTabShell from "./WorkflowTabShell";
import { useWorkflow } from "../Context/WorkflowProvider";
import { normalizeTeachingStrategies } from "../Utils/workflowFormatters";

function StrategyCard({ strategy, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    const hasDetails = strategy.rationale || strategy.implementation?.length > 0;

    return (
        <div className={classes.strategyCard}>
            <button
                type="button"
                className={classes.strategyHeader}
                onClick={() => hasDetails && setOpen(!open)}
                aria-expanded={open}
                disabled={!hasDetails}
            >
                <span className={classes.strategyName}>{strategy.name}</span>
                {hasDetails && <span className={classes.chevron}>{open ? "−" : "+"}</span>}
            </button>
            {strategy.description && (
                <p className={classes.strategyDescription}>{strategy.description}</p>
            )}
            {open && hasDetails && (
                <div className={classes.strategyBody}>
                    {strategy.rationale && (
                        <div className={classes.strategyDetail}>
                            <span className={classes.detailLabel}>Why it works</span>
                            <p>{strategy.rationale}</p>
                        </div>
                    )}
                    {strategy.implementation?.length > 0 && (
                        <div className={classes.strategyDetail}>
                            <span className={classes.detailLabel}>How to implement</span>
                            <ol>
                                {strategy.implementation.map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SectionBlock({ title, children }) {
    if (!children) return null;
    return (
        <section className={classes.sectionBlock}>
            <h3 className={classes.sectionHeading}>{title}</h3>
            {children}
        </section>
    );
}

export default function Strategies() {
    const { results, isLoading, error } = useWorkflow();
    const normalized = normalizeTeachingStrategies(results?.teaching_strategies);
    const hasContent =
        normalized.primary.length > 0 ||
        normalized.alternatives.length > 0 ||
        normalized.scaffolding.length > 0 ||
        normalized.accommodations.length > 0 ||
        normalized.assessments.length > 0;

    return (
        <>
            <ProblemContext />
            <WorkflowTabShell
                title="Teaching Strategies"
                subtitle="Evidence-based strategies to support this student's learning"
                isLoading={isLoading}
                loadingMessage="Generating teaching strategies..."
                error={error}
            >
                {!hasContent && !isLoading && !error && (
                    <p className={classes.empty}>No strategies available for this session yet.</p>
                )}

                {hasContent && (
                    <>
                        {normalized.primary.length > 0 && (
                            <SectionBlock title="Primary Strategies">
                                <div className={classes.strategyList}>
                                    {normalized.primary.map((strategy, index) => (
                                        <StrategyCard
                                            key={index}
                                            strategy={strategy}
                                            defaultOpen={index === 0}
                                        />
                                    ))}
                                </div>
                            </SectionBlock>
                        )}

                        {normalized.scaffolding.length > 0 && (
                            <SectionBlock title="Scaffolding Sequence">
                                <ol className={classes.numberedList}>
                                    {normalized.scaffolding.slice(0, 5).map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ol>
                            </SectionBlock>
                        )}

                        {normalized.accommodations.length > 0 && (
                            <SectionBlock title="Accommodations">
                                <div className={classes.chipRow}>
                                    {normalized.accommodations.map((item, i) => (
                                        <span key={i} className={classes.chip}>{item}</span>
                                    ))}
                                </div>
                            </SectionBlock>
                        )}

                        {normalized.alternatives.length > 0 && (
                            <SectionBlock title="Alternative Approaches">
                                <div className={classes.altList}>
                                    {normalized.alternatives.map((alt, i) => (
                                        <div key={i} className={classes.altCard}>
                                            <strong>{alt.name}</strong>
                                            {alt.description && <p>{alt.description}</p>}
                                            {alt.whenToUse && (
                                                <span className={classes.whenToUse}>
                                                    Use when: {alt.whenToUse}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SectionBlock>
                        )}

                        {normalized.assessments.length > 0 && (
                            <SectionBlock title="Assessment Methods">
                                <ul className={classes.bulletList}>
                                    {normalized.assessments.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </SectionBlock>
                        )}
                    </>
                )}
            </WorkflowTabShell>
        </>
    );
}
