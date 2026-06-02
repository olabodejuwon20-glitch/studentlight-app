import { Copy, Check, Volume2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Attachment, bytesToHuman } from "@/lib/uploads";
import { Button } from "@/components/ui/button";
import { AIMarkdown } from "@/components/ai/AIMarkdown";

interface Props {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  streaming?: boolean;
  actions?: { label: string; onClick: () => void; icon?: React.ComponentType<{ className?: string }> }[];
}

export function MessageBubble({ role, content, attachments, streaming, actions }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (role === "user") {
    return (
      <div className="flex justify-end px-3 sm:px-4 group">
        <div className="max-w-[88%] sm:max-w-[75%] space-y-2">
          {attachments?.map((a, i) => <AttachmentView key={i} a={a} mine />)}
          {content && (
            <div className="rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-3.5 py-2.5 text-[14px] sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
              {content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 group">
      <div className="flex gap-2.5 sm:gap-3 max-w-full">
        <div className="hidden sm:grid size-7 shrink-0 rounded-full bg-primary/10 place-items-center mt-0.5">
          <span className="text-[10px] font-bold text-primary">AI</span>
        </div>
        <div className="min-w-0 flex-1">
          <AIMarkdown content={content || (streaming ? "" : "…")} compact />
          {streaming && (
            <span className="inline-block w-1.5 h-4 bg-foreground/70 align-middle ml-0.5 animate-pulse" />
          )}
        {!streaming && content && (
          <div className="mt-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 px-2" onClick={copy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
        {!streaming && content && actions && actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {actions.map((a, i) => (
              <Button key={i} size="sm" variant="outline"
                className="h-7 text-xs gap-1.5 rounded-full"
                onClick={a.onClick}>
                {a.icon ? <a.icon className="size-3.5" /> : null}
                {a.label}
              </Button>
            ))}
          </div>
        )}
        </div>
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