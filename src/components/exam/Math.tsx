import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/** Renders inline ($..$) and block ($$..$$) math inside a plain string. */
export function Math({ children, className }: { children: string; className?: string }) {
  const html = useMemo(() => renderMixed(children ?? ""), [children]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderMixed(input: string): string {
  if (!input) return "";
  // Tokenize: $$...$$ (block), then $...$ (inline). Escape text segments.
  const blockRx = /\$\$([^$]+)\$\$/g;
  const inlineRx = /\$([^$\n]+)\$/g;

  // Pass 1: replace block math with placeholders we'll restore after escaping
  const blocks: string[] = [];
  let s = input.replace(blockRx, (_m, expr) => {
    blocks.push(safeKatex(expr, true));
    return `\u0000B${blocks.length - 1}\u0000`;
  });

  // Pass 2: inline math
  const inlines: string[] = [];
  s = s.replace(inlineRx, (_m, expr) => {
    inlines.push(safeKatex(expr, false));
    return `\u0000I${inlines.length - 1}\u0000`;
  });

  // Escape remaining text segments
  s = escapeHtml(s);

  // Restore math
  s = s.replace(/\u0000B(\d+)\u0000/g, (_m, i) => blocks[Number(i)]);
  s = s.replace(/\u0000I(\d+)\u0000/g, (_m, i) => inlines[Number(i)]);
  return s;
}

function safeKatex(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr, { displayMode, throwOnError: false, strict: "ignore" });
  } catch {
    return escapeHtml(displayMode ? `$$${expr}$$` : `$${expr}$`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}