import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { RootErrorBoundary } from "./components/ErrorBoundary";

// Guard service-worker registration against Lovable preview iframe / hosts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovableproject-dev.com");

if (!isPreviewHost && !isInIframe && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .catch(() => {});
} else if (isPreviewHost || isInIframe) {
  // Unregister any stray SW in preview contexts
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </HelmetProvider>
);
