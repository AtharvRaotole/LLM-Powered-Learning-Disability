import InternalNavigation from "./InternalNavigation";
import { Outlet } from "react-router-dom";
import classes from "./DetailsLayout.module.css";

export default function DetailsLayout() {
  return (
    <div className={classes.workflowLayout}>
      <InternalNavigation />
      <div className={classes.workflowContent}>
        <Outlet />
      </div>
    </div>
  );
}
