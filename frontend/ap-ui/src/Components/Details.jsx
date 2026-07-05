import { Routes, Route, Navigate } from "react-router-dom";
import DetailsLayout from "./DetailsLayout";
import Description from "./Description";
import Attempt from "./Attempt";
import Strategies from "./Strategies";
import Tutor from "./Tutor";
import Thought from "./Thought";
import Improvement from "./Improvement";
import { WorkflowProvider } from "../Context/WorkflowProvider";

export default function Details() {
  return (
    <Routes>
      <Route path="/" element={<DetailsLayout />}>
        <Route element={<WorkflowProvider />}>
          <Route index element={<Navigate to="description" replace />} />
          <Route path="description" element={<Description />} />
          <Route path="attempt" element={<Attempt />} />
          <Route path="thought" element={<Thought />} />
          <Route path="tutor" element={<Tutor />} />
          <Route path="strategies" element={<Strategies />} />
          <Route path="improvement" element={<Improvement/>}/>
        </Route>
      </Route>
    </Routes>
  );
}
