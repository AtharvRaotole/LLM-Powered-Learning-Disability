import classes from "./UserDisplay.module.css"
import { Route,Routes } from "react-router-dom";
import Navigation from "./Navigation";
import Details from "./Details";
import Problem from "./Problem";
import MultiStudentSimulation from "./MultiStudentSimulation";
import AdaptiveDifficulty from "./AdaptiveDifficulty";
import InteractiveWhiteboard from "./InteractiveWhiteboard";
import AIProblemGenerator from "./AIProblemGenerator";
// import AnalyticsDashboard from "./AnalyticsDashboard";
import AITutorChat from "./AITutorChat";
export default function UserDisplay(){
    return(
        <div className={classes.displayContainer}>
            <a href="#main-content" className="skip-to-main">
                Skip to main content
            </a>
            <header className={classes.header} role="banner">
                <h1>Learning Disability Simulation Dashboard</h1>
                <p className={classes.subtitle}>Explore how different learning disabilities affect math problem-solving and discover effective teaching strategies</p>
            </header>
            <div className={classes.routeContainer}>
                <nav className={classes.navigation} role="navigation" aria-label="Main navigation">
                    <Navigation />
                </nav>
                <main className={classes.content} id="main-content" role="main">
                    <Routes>
                        <Route path="/" element={<Problem />} />
                        <Route path="disability/:id/details/*" element={<Details/>} />
                        <Route path="multi-simulation" element={<MultiStudentSimulation/>} />
                        <Route path="adaptive-difficulty" element={<AdaptiveDifficulty/>} />
                        <Route path="whiteboard" element={<InteractiveWhiteboard/>} />
                        <Route path="ai-problem-generator" element={<AIProblemGenerator/>} />
                        {/* <Route path="analytics-dashboard" element={<AnalyticsDashboard/>} /> */}
                        <Route path="ai-tutor-chat" element={<AITutorChat/>} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}