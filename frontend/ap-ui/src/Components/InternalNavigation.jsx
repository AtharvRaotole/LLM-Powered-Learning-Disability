import classes from './InternalNavigation.module.css'
import FloatingPillTabs from './FloatingPillTabs'
import UserContext from '../Store/UserContext'
import { useContext, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import DisabilitiesEnum from '../Store/Disabilities';

const TAB_KEYS = ['description', 'attempt', 'thought', 'strategies', 'improvement'];

function tabFromPathname(pathname) {
    const segment = pathname.split('/').pop();
    return TAB_KEYS.includes(segment) ? segment : 'description';
}

export default function InternalNavigation(){
    const {id} = useParams();
    const userCtx = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();
    const disability = DisabilitiesEnum[id];
    const mode = useMemo(
        () => tabFromPathname(location.pathname),
        [location.pathname]
    );

    useEffect(() => {
        userCtx.setUserMode(mode);
    }, [mode, userCtx]);

    function handleClick(selectedMode){
        userCtx.setUserMode(selectedMode);
        navigate(`/disability/${id}/details/${selectedMode}`);
    }
    
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
            key: 'improvement', 
            label: 'Improvement', 
            icon: '',
            description: 'Improvement in student learning',
            step: '5'
        }
    ];
    
    const onTutorRoute = location.pathname.endsWith('/tutor');

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
            {!onTutorRoute && (
                <div className={classes.tabsContainer}>
                    <FloatingPillTabs
                        items={navigationItems}
                        activeKey={mode}
                        onSelect={handleClick}
                    />
                </div>
            )}
        </div>
    )
}
