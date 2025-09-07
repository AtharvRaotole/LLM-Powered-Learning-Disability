import classes from './Navigation.module.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import DisabilityIdentifier from './DisabilityIdentifier';

export default function Navigation(){
    const [selectedDisabilityID, setSelectedDisabilityID] = useState('');
    const [showIdentifier, setShowIdentifier] = useState(false);
    
    useEffect(() => {
        const selected = sessionStorage.getItem('disability');
        if(selected){
            setSelectedDisabilityID(JSON.parse(selected));
        }
    }, [])
    
    const navigate = useNavigate();
    
    const disabilities = [
        {id: '1', name: 'Dyslexia', icon: '📖', description: 'Reading difficulties'},
        {id: '2', name: 'Dysgraphia', icon: '✍️', description: 'Writing difficulties'},
        {id: '3', name: 'Dyscalculia', icon: '🔢', description: 'Math difficulties'},
        {id: '4', name: 'ADHD', icon: '⚡', description: 'Attention & hyperactivity'},
        {id: '5', name: 'APD', icon: '👂', description: 'Auditory processing'},
        {id: '6', name: 'NVLD', icon: '👁️', description: 'Non-verbal learning'},
        {id: '7', name: 'LPD', icon: '💬', description: 'Language processing'}
    ]
    
    function setDisability(id) {
        setSelectedDisabilityID(id);
        const selected = disabilities.find(disability => disability.id === id);
        if (selected) {
            sessionStorage.setItem('disability', JSON.stringify(selected.id));
        }
        navigate(`/disability/${id}/details`)
    }
    
    return(
        <div className={classes.NavigationContainer}>
            <ul className={classes.NavigationList}>
                <li className={`${classes.NavigationItem} ${classes.NavigationHeader}`}>
                    Learning Disabilities
                </li>
                {disabilities.map((disability) => (
                    <li 
                        key={disability.id} 
                        className={`${classes.NavigationItem} ${selectedDisabilityID === disability.id ? classes.selectedItem : ''}`}
                        onClick={() => setDisability(disability.id)}
                    >
                        <div className={classes.disabilityName}>
                            <span className={classes.disabilityIcon}>{disability.icon}</span>
                            {disability.name}
                        </div>
                        <div className={classes.arrow}>
                            {selectedDisabilityID === disability.id ? '→' : '›'}
                        </div>
                    </li>
                ))}
            </ul>
            
            <div className={classes.identifierSection}>
                <button 
                    className={classes.identifierButton}
                    onClick={() => setShowIdentifier(!showIdentifier)}
                >
                    🔍 Disability Identifier
                </button>
                {showIdentifier && (
                    <div className={classes.identifierPanel}>
                        <DisabilityIdentifier />
                    </div>
                )}
            </div>
        </div>
    )
}