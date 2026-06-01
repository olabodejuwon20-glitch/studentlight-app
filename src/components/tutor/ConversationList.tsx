import { Plus, MessagesSquare, Pin, Trash2, Pencil, Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface ConvItem {
  id: string;
  title: string;
  pinned: boolean;
  last_message_at: string;
}

interface Props {
  items: ConvItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}

function bucket(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (now - t < day) return "Today";
  if (now - t < 7 * day) return "Previous 7 days";
  if (now - t < 30 * day) return "Previous 30 days";
  return "Older";
}

export function ConversationList({ items, activeId, onSelect, onNew, onRename, onDelete, onTogglePin }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const pinned = items.filter(i => i.pinned);
  const rest = items.filter(i => !i.pinned);
  const groups: Record<string, ConvItem[]> = {};
  for (const it of rest) {
    const b = bucket(it.last_message_at);
    (groups[b] ||= []).push(it);
  }
  const order = ["Today", "Previous 7 days", "Previous 30 days", "Older"];

  function startEdit(it: ConvItem) {
    setEditingId(it.id);
    setEditText(it.title);
  }

  function renderItem(it: ConvItem) {
    const isActive = it.id === activeId;
    const isEditing = editingId === it.id;
    return (
      <li key={it.id} className="group/item">
        <div className={cn(
          "flex items-center gap-1 rounded-lg pr-1 text-sm",
          isActive ? "bg-secondary" : "hover:bg-secondary/60",
        )}>
          {isEditing ? (
            <div className="flex-1 flex items-center gap-1 px-2 py-1.5">
              <Input value={editText} onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { onRename(it.id, editText.trim() || it.title); setEditingId(null); }
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus className="h-7 text-sm" />
              <Button size="icon" variant="ghost" className="size-7" onClick={() => { onRename(it.id, editText.trim() || it.title); setEditingId(null); }}>
                <Check className="size-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingId(null)}>
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <button onClick={() => onSelect(it.id)} className="flex-1 text-left px-3 py-2 truncate flex items-center gap-2 min-w-0">
                {it.pinned && <Pin className="size-3 text-primary shrink-0" />}
                <span className="truncate">{it.title}</span>
              </button>
              <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" className="size-7" onClick={() => onTogglePin(it.id, !it.pinned)} title={it.pinned ? "Unpin" : "Pin"}>
                  <Pin className={cn("size-3.5", it.pinned && "fill-current text-primary")} />
                </Button>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => startEdit(it)} title="Rename">
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => onDelete(it.id)} title="Delete">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="outline">
          <Plus className="size-4" /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {items.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-12 px-4">
            <MessagesSquare className="size-6 mx-auto mb-2 opacity-50" />
            No conversations yet
          </div>
        )}
        {pinned.length > 0 && (
          <div>
            <div className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pinned</div>
            <ul className="space-y-0.5">{pinned.map(renderItem)}</ul>
          </div>
        )}
        {order.map(g => groups[g] && (
          <div key={g}>
            <div className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g}</div>
            <ul className="space-y-0.5">{groups[g].map(renderItem)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}