import { useEffect,useState } from "react";
import { useParams } from "react-router-dom";
import DisabilitiesEnum from "../Store/Disabilities";
import classes from "./Thought.module.css";
export default function Thought(){
    const {id}=useParams();
    const disability=DisabilitiesEnum[id];
    const problem=sessionStorage.getItem('problem');
    const[response,setResponse]=useState(null);
    const[isLoading,setIsLoading]=useState(true);
    const[error,setError]=useState(null);
    
    useEffect(()=>{
        async function generateAttempt(disability){
            setIsLoading(true);
            const response=await fetch("http://localhost:8000/api/v1/openai/generate_thought", {
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
            setResponse(jsonResponse);
            setIsLoading(false);
        }
        generateAttempt(disability);
    },[disability,problem])
    return(
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.headerIcon}>🧠</div>
                <div>
                    <h2 className={classes.headerTitle}>Thought Analysis</h2>
                    <p className={classes.headerSubtitle}>
                        Professional analysis of the student's thinking process
                    </p>
                </div>
            </div>
            
            {isLoading && (
                <div className={classes.loading}>
                    Analyzing student's thought process...
                </div>
            )}
            
            {error && (
                <div className={classes.error}>
                    {error}
                </div>
            )}
            
            {response && !isLoading && (
                <div className={classes.analysis}>
                    {response.thought && (
                        <div className={classes.thoughtSection}>
                            <div className={classes.sectionTitle}>🧠 Cognitive Analysis</div>
                            <div className={classes.sectionContent}>
                                {response.thought}
                            </div>
                        </div>
                    )}
                    
                    {response.mistake_analysis && (
                        <div className={classes.mistakeSection}>
                            <div className={classes.sectionTitle}>⚠️ Mistake Analysis</div>
                            <div className={classes.mistakeDetails}>
                                <div className={classes.mistakeItem}>
                                    <div className={classes.mistakeLabel}>Type</div>
                                    <div className={classes.mistakeValue}>{response.mistake_analysis.type}</div>
                                </div>
                                <div className={classes.mistakeItem}>
                                    <div className={classes.mistakeLabel}>Severity</div>
                                    <div className={classes.mistakeValue}>{response.mistake_analysis.severity}</div>
                                </div>
                                <div className={classes.mistakeItem}>
                                    <div className={classes.mistakeLabel}>Frequency</div>
                                    <div className={classes.mistakeValue}>{response.mistake_analysis.frequency}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {response.disability_connections && response.disability_connections.length > 0 && (
                        <div className={classes.connectionsSection}>
                            <div className={classes.sectionTitle}>🔗 Disability Connections</div>
                            <ul className={classes.connectionsList}>
                                {response.disability_connections.map((connection, index) => (
                                    <li key={index}>
                                        {connection}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {response.learning_implications && (
                        <div className={classes.implicationsSection}>
                            <div className={classes.sectionTitle}>💡 Learning Implications</div>
                            <div className={classes.implicationsContent}>
                                {response.learning_implications}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}