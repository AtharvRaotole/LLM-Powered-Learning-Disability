import classes from "./UserDisplay.module.css"
import { Route,Routes } from "react-router-dom";
import Navigation from "./Navigation";
import Details from "./Details";
import Problem from "./Problem";
export default function UserDisplay(){
    return(
        <div className={classes.displayContainer}>
            <div className={classes.header}>
                <h1>Learning Disability Simulation Dashboard</h1>
                <p>Explore how different learning disabilities affect math problem-solving and discover effective teaching strategies</p>
            </div>
            <div className={classes.routeContainer}>
                <div className={classes.navigation}>
                    <Navigation />
                </div>
                <div className={classes.content}>
                    <Problem />
                    <Routes>
                        <Route path="disability/:id/details/*" element={<Details/>} />
                    </Routes>
                </div>
            </div>
        </div>
    )
}