import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Volume2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Attachment, bytesToHuman } from "@/lib/uploads";
import { Button } from "@/components/ui/button";

interface Props {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  streaming?: boolean;
}

export function MessageBubble({ role, content, attachments, streaming }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (role === "user") {
    return (
      <div className="flex justify-end px-4 group">
        <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
          {attachments?.map((a, i) => <AttachmentView key={i} a={a} mine />)}
          {content && (
            <div className="rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 group">
      <div className="max-w-full sm:max-w-[90%]">
        <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-pre:bg-secondary prose-pre:text-foreground prose-code:before:hidden prose-code:after:hidden prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || (streaming ? "" : "…")}
          </ReactMarkdown>
          {streaming && (
            <span className="inline-block w-1.5 h-4 bg-foreground/70 align-middle ml-0.5 animate-pulse" />
          )}
        </div>
        {!streaming && content && (
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={copy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AttachmentView({ a, mine }: { a: Attachment; mine?: boolean }) {
  if (a.type === "image") {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={a.url} alt={a.name} className="rounded-xl max-h-64 object-cover border border-border" />
      </a>
    );
  }
  if (a.type === "audio") {
    return (
      <div className={cn("rounded-2xl px-3 py-2 border", mine ? "bg-primary/15 border-primary/30" : "bg-muted border-border")}>
        <div className="flex items-center gap-2 mb-1 text-xs opacity-80">
          <Volume2 className="size-3.5" /> Voice note
        </div>
        <audio controls src={a.url} className="w-full max-w-[260px]" />
        {a.transcript && (
          <div className="text-xs italic opacity-80 mt-1 max-w-[260px]">“{a.transcript}”</div>
        )}
      </div>
    );
  }
  return (
    <a href={a.url} download={a.name} target="_blank" rel="noopener noreferrer"
       className={cn("flex items-center gap-2 rounded-xl px-3 py-2 border text-xs", mine ? "bg-primary/15 border-primary/30" : "bg-muted border-border")}>
      <div className="size-8 rounded-md bg-background grid place-items-center text-[10px] font-bold uppercase">
        {(a.name.split(".").pop() || "file").slice(0, 4)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{a.name}</div>
        <div className="opacity-70">{bytesToHuman(a.size)}</div>
      </div>
    </a>
  );
}