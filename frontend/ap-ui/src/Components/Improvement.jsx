import { useEffect,useState } from "react";
import { useParams } from "react-router-dom";
import DisabilitiesEnum from "../Store/Disabilities";
import { buildFullKey,getOrRunImprovementAnalysis } from "../Utils/langgraphApi";

export default function Improvement(){
    const {id}=useParams();
    const disability = DisabilitiesEnum[id];
    const problem = sessionStorage.getItem('problem');
    const gradeLevel = sessionStorage.getItem('gradeLevel') || '7th';
    const difficulty = sessionStorage.getItem('difficulty') || 'medium';
    const [response,setResponse]=useState(null);
    const [isLoading,setIsLoading]=useState(true);
    const [error,setError]=useState(null);
    useEffect(()=>{
        async function loadImprovement(){
            setIsLoading(true);
            setError(null);
            try{
                const payload = {
                    grade_level: gradeLevel,
                    difficulty,
                    disability: disability,
                    problem,
                };
                const key=buildFullKey(payload);
                const details=sessionStorage.getItem(key);
                if(!details){
                    throw new Error("No problem data found in session storage");
                }
                const improvement_key=key+"|imporovement"
                let improvement=await getOrRunImprovementAnalysis(improvement_key,JSON.parse(details));
                console.log(improvement_key);

            }
            catch (err) {
                const message = err?.message || "Error while generating attempt. Please try again.";
                setError(message);
                console.error("Student simulation error:", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadImprovement();
    },[]);
    return(
        <div></div>
    )
}