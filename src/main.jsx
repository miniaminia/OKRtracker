import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OKRTracker from "./OKRTracker.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <OKRTracker />
  </StrictMode>
);
