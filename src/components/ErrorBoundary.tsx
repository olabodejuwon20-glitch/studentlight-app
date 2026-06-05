import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/error-reporter";

interface State { error: Error | null }

export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("[RootErrorBoundary]", error, info.componentStack);
    reportError({
      source: "react",
      message: error.message || "React render error",
      cause: error.name,
      stack: error.stack,
      context: { componentStack: info.componentStack?.slice(0, 2000) },
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md w-full rounded-xl border border-destructive/30 bg-card p-6 shadow-card text-center">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto mb-3">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="font-display text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {this.state.error.message || "An unexpected error occurred. Please try again."}
          </p>
          <div className="flex gap-2 justify-center mt-5">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="size-4 mr-2" /> Reload
            </Button>
            <Button onClick={this.reset}>Dismiss</Button>
          </div>
        </div>
      </div>
    );
  }
}