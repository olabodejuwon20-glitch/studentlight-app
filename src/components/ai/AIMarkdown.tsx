import { useState, memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  className?: string;
  /** Use compact spacing — good for chat bubbles and small cards. */
  compact?: boolean;
}

/**
 * Unified AI response renderer.
 * - GitHub-Flavored Markdown (tables, task lists, strikethrough, autolinks)
 * - Mobile-first typography that scales up on larger screens
 * - Code blocks with one-click copy
 * - Horizontally scrollable tables on small screens
 * - Respects the app's design tokens (no hard-coded colors)
 */
export const AIMarkdown = memo(function AIMarkdown({ content, className, compact }: Props) {
  return (
    <div
      className={cn(
        // Base prose tuned for readability on mobile, denser on chat
        "prose prose-sm sm:prose-base max-w-none break-words",
        "dark:prose-invert",
        // Color tokens
        "prose-headings:font-display prose-headings:tracking-tight",
        "prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
        "prose-blockquote:border-l-primary/40 prose-blockquote:bg-muted/40 prose-blockquote:rounded-r-md prose-blockquote:px-3 prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
        // Headings sized down for in-chat use
        "prose-h1:text-lg sm:prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-2",
        "prose-h2:text-base sm:prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-1.5",
        "prose-h3:text-sm sm:prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1",
        // Lists
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:marker:text-primary/60",
        // Paragraphs
        compact ? "prose-p:my-1.5" : "prose-p:my-2",
        // Inline code
        "prose-code:before:hidden prose-code:after:hidden prose-code:bg-secondary prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:font-medium",
        // Tables – wrapper below adds scroll
        "prose-table:my-3 prose-th:bg-muted prose-th:text-foreground prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-th:border prose-td:border prose-th:border-border prose-td:border-border",
        // HR
        "prose-hr:border-border prose-hr:my-4",
        // Images
        "prose-img:rounded-lg prose-img:border prose-img:border-border",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

const components: Components = {
  // Wrap tables so they scroll on small screens
  table: ({ node, ...props }) => (
    <div className="not-prose my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-muted/60" {...props} />,
  th: ({ node, ...props }) => (
    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold text-foreground" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="border-b border-border/60 px-3 py-2 text-sm align-top" {...props} />
  ),
  // Code blocks: copy button + horizontal scroll
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  // Smart links
  a: ({ node, href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
  // Tighter list spacing
  ul: ({ node, ...props }) => <ul className="list-disc pl-5" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5" {...props} />,
};

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  // Pull the raw text out of the <code> child for copying
  const text = extractText(children);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="not-prose group relative my-3 overflow-hidden rounded-lg border border-border bg-secondary/60">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto px-3 py-3 text-[12.5px] leading-relaxed text-foreground">
        {children}
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in (node as any)) {
    return extractText((node as any).props?.children);
  }
  return "";
}