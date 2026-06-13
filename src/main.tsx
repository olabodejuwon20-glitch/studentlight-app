import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { RootErrorBoundary } from "./components/ErrorBoundary";
import { installGlobalErrorReporter } from "./lib/error-reporter";
import { registerAppSW } from "./lib/registerSW";

void registerAppSW();

installGlobalErrorReporter();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </HelmetProvider>
);
