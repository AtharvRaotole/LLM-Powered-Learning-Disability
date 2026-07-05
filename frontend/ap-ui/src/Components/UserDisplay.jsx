import { useState, useEffect } from 'react';
import classes from "./UserDisplay.module.css"
import { Route, Routes } from "react-router-dom";
import Navigation from "./Navigation";
import Details from "./Details";
import Problem from "./Problem";
import AdaptiveDifficulty from "./AdaptiveDifficulty";
import InteractiveWhiteboard from "./InteractiveWhiteboard";
import DisabilityIdentifier from "./DisabilityIdentifier";
import MyHistory from "./MyHistory";
import AuthModal from "./AuthModal";
import BrandName from "./BrandName";
import FloatingChatWidget from "./FloatingChatWidget";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../Store/AuthContext";

export default function UserDisplay() {
    const { user, signOut } = useAuth();
    const [authOpen, setAuthOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setSidebarCollapsed(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile && !sidebarCollapsed) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarCollapsed]);

    return (
        <div className={`${classes.appShell} ${sidebarCollapsed ? classes.sidebarCollapsed : ''}`}>
            <a href="#main-content" className="skip-to-main">
                Skip to main content
            </a>
            <Navigation
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            />
            {!sidebarCollapsed && (
                <button
                    type="button"
                    className={classes.sidebarBackdrop}
                    onClick={() => setSidebarCollapsed(true)}
                    aria-label="Close navigation menu"
                />
            )}
            <div className={classes.mainArea}>
                <header className={classes.topBar} role="banner">
                    <button
                        type="button"
                        className={classes.mobileMenuButton}
                        onClick={() => setSidebarCollapsed((prev) => !prev)}
                        aria-label={sidebarCollapsed ? 'Open navigation menu' : 'Close navigation menu'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                        </svg>
                    </button>
                    <div className={classes.topBarContent}>
                        <img
                            src={`${process.env.PUBLIC_URL}/logo.svg`}
                            alt="MindMath"
                            className={classes.topBarLogo}
                        />
                        <div className={classes.topBarTitles}>
                            <BrandName className={classes.pageTitle} size="sm" />
                            <p className={classes.pageSubtitle}>
                                Understand. Support. Empower.
                            </p>
                        </div>
                    </div>
                    <div className={classes.authActions}>
                        <ThemeToggle />
                        {user ? (
                            <div className={classes.userInfo}>
                                <span className={classes.userEmail}>{user.email}</span>
                                <button className={classes.signOutBtn} onClick={signOut}>
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <button className={classes.signInBtn} onClick={() => setAuthOpen(true)}>
                                Sign In
                            </button>
                        )}
                    </div>
                </header>
                <main className={classes.content} id="main-content" role="main">
                    <Routes>
                        <Route path="/" element={<Problem />} />
                        <Route path="disability/:id/details/*" element={<Details />} />
                        <Route path="adaptive-difficulty" element={<AdaptiveDifficulty />} />
                        <Route path="whiteboard" element={<InteractiveWhiteboard />} />
                        <Route path="disability-identifier" element={<DisabilityIdentifier />} />
                        <Route path="my-history" element={<MyHistory />} />
                    </Routes>
                </main>
            </div>
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
            <FloatingChatWidget />
        </div>
    );
}
