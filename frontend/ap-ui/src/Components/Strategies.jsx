import { useEffect,useState } from "react";
import { useParams } from "react-router-dom";
import DisabilitiesEnum from "../Store/Disabilities";
import classes from "./Strategies.module.css";
export default function Strategies(){
    const {id}=useParams();
    const disability=DisabilitiesEnum[id];
    const problem=sessionStorage.getItem('problem');
    const[response,setResponse]=useState(null);
    const[isLoading,setIsLoading]=useState(true);
    const[error,setError]=useState(null);
    
    useEffect(()=>{
        async function generateAttempt(disability){
            setIsLoading(true);
            const response=await fetch("http://localhost:8000/api/v1/openai/generate_strategies", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                disability: disability,
                problem: problem
            })
            })
            if(!response.ok){
                setError("Error while generating attempt");
                setIsLoading(false);
                return;
            }
            const jsonResponse=await response.json();
            console.log(jsonResponse);
            setResponse(jsonResponse);
            setIsLoading(false);
        }
        generateAttempt(disability);
    },[disability,problem])
    return(
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.headerIcon}>🎯</div>
                <div>
                    <h2 className={classes.headerTitle}>Teaching Strategies</h2>
                    <p className={classes.headerSubtitle}>
                        Evidence-based strategies to support this student's learning
                    </p>
                </div>
            </div>
            
            {isLoading && (
                <div className={classes.loading}>
                    Generating teaching strategies...
                </div>
            )}
            
            {error && (
                <div className={classes.error}>
                    {error}
                </div>
            )}
            
            {response && !isLoading && (
                <div className={classes.strategies}>
                    {response.immediate_strategies && response.immediate_strategies.length > 0 && (
                        <div className={classes.strategySection}>
                            <div className={classes.sectionTitle}>🚀 Immediate Strategies</div>
                            <div className={classes.strategyList}>
                                {response.immediate_strategies.map((strategy, index) => (
                                    <div key={index} className={classes.strategyItem}>
                                        {strategy}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {response.accommodations && response.accommodations.length > 0 && (
                        <div className={classes.strategySection}>
                            <div className={classes.sectionTitle}>⚙️ Accommodations</div>
                            <div className={classes.strategyList}>
                                {response.accommodations.map((accommodation, index) => (
                                    <div key={index} className={classes.strategyItem}>
                                        {accommodation}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {response.multi_sensory_approaches && response.multi_sensory_approaches.length > 0 && (
                        <div className={classes.strategySection}>
                            <div className={classes.sectionTitle}>👁️ Multi-Sensory Approaches</div>
                            <div className={classes.strategyList}>
                                {response.multi_sensory_approaches.map((approach, index) => (
                                    <div key={index} className={classes.strategyItem}>
                                        {approach}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {response.technology_tools && response.technology_tools.length > 0 && (
                        <div className={classes.strategySection}>
                            <div className={classes.sectionTitle}>💻 Technology Tools</div>
                            <div className={classes.strategyList}>
                                {response.technology_tools.map((tool, index) => (
                                    <div key={index} className={classes.strategyItem}>
                                        {tool}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {response.assessment_modifications && response.assessment_modifications.length > 0 && (
                        <div className={classes.strategySection}>
                            <div className={classes.sectionTitle}>📝 Assessment Modifications</div>
                            <div className={classes.strategyList}>
                                {response.assessment_modifications.map((modification, index) => (
                                    <div key={index} className={classes.strategyItem}>
                                        {modification}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {response.parent_communication && (
                        <div className={classes.strategySection}>
                            <div className={classes.sectionTitle}>👨‍👩‍👧‍👦 Parent Communication</div>
                            <div className={classes.parentNote}>
                                {response.parent_communication}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}