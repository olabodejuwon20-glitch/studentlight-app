import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { RootErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </HelmetProvider>
);
