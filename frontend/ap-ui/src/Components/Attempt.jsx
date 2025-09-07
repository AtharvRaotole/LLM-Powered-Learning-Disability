import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import DisabilitiesEnum from "../Store/Disabilities"
import classes from "./Attempt.module.css"

export default function Attempt(){
    const {id} = useParams();
    const disability = DisabilitiesEnum[id];
    const problem = sessionStorage.getItem('problem');
    const [response, setResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        async function generateAttempt(disability){
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch("http://localhost:8000/api/v1/openai/generate_attempt", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        disability: disability,
                        problem: problem
                    })
                });
                
                if(!response.ok){
                    throw new Error("Failed to generate student attempt");
                }
                
                const jsonResponse = await response.json();
                setResponse(jsonResponse);
            } catch (err) {
                setError("Error while generating attempt. Please try again.");
                console.error("Error:", err);
            } finally {
                setIsLoading(false);
            }
        }
        
        if (disability && problem) {
            generateAttempt(disability);
        }
    }, [disability, problem])
    
    return(
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.headerIcon}>🎭</div>
                <div>
                    <h2 className={classes.headerTitle}>Student Simulation</h2>
                    <p className={classes.headerSubtitle}>
                        How a student with {disability} would approach this problem
                    </p>
                </div>
            </div>
            
            {isLoading && (
                <div className={classes.loading}>
                    Simulating student's approach...
                </div>
            )}
            
            {error && (
                <div className={classes.error}>
                    {error}
                </div>
            )}
            
            {response && !isLoading && (
                <>
                    {response.thoughtprocess && (
                        <div className={classes.thoughtProcess}>
                            <div className={classes.thoughtProcessTitle}>
                                Student's Internal Thoughts
                            </div>
                            <div className={classes.thoughtProcessContent}>
                                {response.thoughtprocess}
                            </div>
                        </div>
                    )}
                    
                    {response.steps_to_solve && response.steps_to_solve.length > 0 && (
                        <div className={classes.stepsContainer}>
                            <div className={classes.stepsTitle}>
                                Step-by-Step Solution
                            </div>
                            {response.steps_to_solve.map((step, index) => (
                                <div key={index} className={classes.step}>
                                    <div className={classes.stepNumber}>
                                        Step {index + 1}
                                    </div>
                                    <div className={classes.stepContent}>
                                        {step}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}



// {
//     "thoughtprocess": "I know Amy has 24 apples and she wants to share them among her friends. I might have trouble understanding quantities, so I might confuse how many friends there are or how many apples each friend should get.",
//     "steps_to_solve": [
//       "Step 1: Amy has 24 apples and she wants to share them among her 6 friends.",
//       "Step 2: Divide 24 by 6 to find how many apples each friend will get. 24 / 6 = 4 apples per friend.",
//       "Final Step: Each friend will get 4 apples. Therefore, each friend will get 4 apples."
//     ]
//   }