import classes from '../Utils/Button.module.css'
import UserContext from '../Store/UserContext'
import { useContext, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom';

export default function InternalNavigation(){
    const {id} = useParams();
    const [mode, setMode] = useState('description');
    const userCtx = useContext(UserContext);
    const navigate = useNavigate();
    
    function handleClick(selectedMode){
        userCtx.setUserMode(selectedMode);
        setMode(selectedMode)
    }
    
    useEffect(() => {
        userCtx.setUserMode(mode);
        navigate(`/disability/${id}/details/${mode}`);
    }, [id, mode, navigate, userCtx])
    
    const navigationItems = [
        { 
            key: 'description', 
            label: 'Disability Overview', 
            icon: '📋',
            description: 'Learn about the disability'
        },
        { 
            key: 'attempt', 
            label: 'Student Simulation', 
            icon: '🎭',
            description: 'See how student would solve'
        },
        { 
            key: 'thought', 
            label: 'Thought Analysis', 
            icon: '🧠',
            description: 'Understand student thinking'
        },
        { 
            key: 'strategies', 
            label: 'Teaching Strategies', 
            icon: '🎯',
            description: 'Effective teaching methods'
        },
        { 
            key: 'tutor', 
            label: 'Tutor Conversation', 
            icon: '💬',
            description: 'Interactive tutoring session'
        }
    ];
    
    return(
        <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px', 
            padding: '20px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderRadius: '12px',
            margin: '20px',
            border: '1px solid #e2e8f0'
        }}>
            {navigationItems.map((item) => (
                <button 
                    key={item.key}
                    className={`${classes.genericButton} ${mode === item.key ? classes.buttonActive : ''}`} 
                    onClick={() => handleClick(item.key)}
                    title={item.description}
                >
                    <span className={classes.buttonIcon}>{item.icon}</span>
                    <span className={classes.buttonText}>{item.label}</span>
                </button>
            ))}
        </div>
    )
}