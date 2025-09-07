import { useEffect,useState } from "react";
import { useParams } from "react-router-dom";
import DisabilitiesEnum from "../Store/Disabilities";
import classes from "./Tutor.module.css";
export default function Tutor(){
    const {id}=useParams();
    const disability=DisabilitiesEnum[id];
    const problem=sessionStorage.getItem('problem');
    const[response,setResponse]=useState(null);
    const[isLoading,setIsLoading]=useState(true);
    const[error,setError]=useState(null);
    
    useEffect(()=>{
        async function generateAttempt(disability){
            setIsLoading(true);
            const response=await fetch("http://localhost:8000/api/v1/openai/generate_tutor", {
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
                </div>
            )}
        </div>
    )
}