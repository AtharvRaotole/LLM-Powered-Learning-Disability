import classes from './InternalNavigation.module.css'
import UserContext from '../Store/UserContext'
import { useContext, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import DisabilitiesEnum from '../Store/Disabilities';

export default function InternalNavigation(){
    const {id} = useParams();
    const [mode, setMode] = useState('description');
    const userCtx = useContext(UserContext);
    const navigate = useNavigate();
    const disability = DisabilitiesEnum[id];
    
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
            label: 'Overview', 
            icon: '📋',
            description: 'Learn about the disability',
            step: '1'
        },
        { 
            key: 'attempt', 
            label: 'Simulation', 
            icon: '🎭',
            description: 'See how student would solve',
            step: '2'
        },
        { 
            key: 'thought', 
            label: 'Analysis', 
            icon: '🧠',
            description: 'Understand student thinking',
            step: '3'
        },
        { 
            key: 'strategies', 
            label: 'Strategies', 
            icon: '🎯',
            description: 'Effective teaching methods',
            step: '4'
        },
        { 
            key: 'tutor', 
            label: 'Tutor', 
            icon: '💬',
            description: 'Interactive tutoring session',
            step: '5'
        }
    ];
    
    return(
        <div className={classes.navigationContainer}>
            <div className={classes.navigationHeader}>
                <h2 className={classes.disabilityTitle}>
                    <span className={classes.titleIcon}>🎓</span>
                    Learning with {disability}
                </h2>
                <p className={classes.navigationSubtitle}>
                    Follow the tabs below to understand how students with this disability approach problems
                </p>
            </div>
            <div className={classes.tabsContainer}>
                {navigationItems.map((item, index) => (
                    <button 
                        key={item.key}
                        className={`${classes.tabButton} ${mode === item.key ? classes.tabActive : ''}`} 
                        onClick={() => handleClick(item.key)}
                        title={item.description}
                    >
                        <span className={classes.tabStep}>{item.step}</span>
                        <span className={classes.tabIcon}>{item.icon}</span>
                        <span className={classes.tabLabel}>{item.label}</span>
                        {index < navigationItems.length - 1 && (
                            <span className={classes.tabArrow}>→</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}