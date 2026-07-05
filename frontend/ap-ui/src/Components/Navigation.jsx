import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Store/AuthContext';
import SidebarNavigation from './SidebarNavigation';

const disabilities = [
    { id: '1', name: 'Dyslexia' },
    { id: '2', name: 'Dysgraphia' },
    { id: '3', name: 'Dyscalculia' },
    { id: '4', name: 'ADHD' },
    { id: '5', name: 'APD' },
    { id: '6', name: 'NVLD' },
    { id: '7', name: 'LPD' },
];

export default function Navigation({ isCollapsed, onToggleCollapse }) {
    const [selectedDisabilityID, setSelectedDisabilityID] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const selected = sessionStorage.getItem('disability');
        if (selected) {
            setSelectedDisabilityID(JSON.parse(selected));
        }
    }, []);

    function setDisability(id) {
        setSelectedDisabilityID(id);
        sessionStorage.setItem('disability', JSON.stringify(id));
        navigate(`/disability/${id}/details/description`);
    }

    function isPathActive(path) {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    }

    const sections = [
        {
            title: 'Start here',
            items: [
                {
                    key: 'problem-generator',
                    label: 'Problem Generator',
                    isActive: isPathActive('/'),
                    onClick: () => navigate('/'),
                },
                {
                    key: 'tutor-session',
                    label: 'AI Tutor',
                    hint: 'Select a disability first',
                    isActive: location.pathname.endsWith('/tutor'),
                    disabled: !selectedDisabilityID,
                    onClick: () => selectedDisabilityID && navigate(`/disability/${selectedDisabilityID}/details/tutor`),
                },
                ...(user
                    ? [{
                        key: 'my-history',
                        label: 'My History',
                        isActive: isPathActive('/my-history'),
                        onClick: () => navigate('/my-history'),
                    }]
                    : []),
            ],
        },
        {
            title: 'Disabilities',
            items: disabilities.map((disability) => ({
                key: `disability-${disability.id}`,
                label: disability.name,
                isActive: location.pathname.startsWith(`/disability/${disability.id}/`),
                onClick: () => setDisability(disability.id),
            })),
        },
        {
            title: 'Tools',
            items: [
                {
                    key: 'disability-identifier',
                    label: 'Disability Assessment',
                    isActive: isPathActive('/disability-identifier'),
                    onClick: () => navigate('/disability-identifier'),
                },
                {
                    key: 'adaptive-difficulty',
                    label: 'Adaptive Difficulty',
                    isActive: isPathActive('/adaptive-difficulty'),
                    onClick: () => navigate('/adaptive-difficulty'),
                },
                {
                    key: 'whiteboard',
                    label: 'Interactive Whiteboard',
                    isActive: isPathActive('/whiteboard'),
                    onClick: () => navigate('/whiteboard'),
                },
            ],
        },
    ];

    return (
        <SidebarNavigation
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            sections={sections}
        />
    );
}
