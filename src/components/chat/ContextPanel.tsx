import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Image as ImageIcon, Paperclip, Search, Upload, X, Check,
  PanelLeftClose, Sparkles, Lock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

type Doc = {
  id: string;
  file_name: string;
  status: string | null;
  created_at: string;
};

type Props = {
  userId: string | null;
  activeDocId: string | null;
  onAttach: (doc: { id: string; name: string } | null) => void;
  onUploadClick: () => void;
  onCollapse?: () => void;
  isPro?: boolean;
};

export function ContextPanel({ userId, activeDocId, onAttach, onUploadClick, onCollapse, isPro = true }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("id, file_name, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        if (error) toast.error("Couldn't load your library");
        else setDocs((data ?? []) as Doc[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, activeDocId]);

  const filtered = docs.filter((d) =>
    !q.trim() || d.file_name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-card/30 backdrop-blur animate-fade-in">
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-primary/10 grid place-items-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">Context</div>
            <div className="text-[10px] text-muted-foreground">Study materials & sources</div>
          </div>
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-md hover:bg-accent/40 transition text-muted-foreground"
            title="Hide context panel"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 border-b border-border">
        <Button onClick={onUploadClick} variant="hero" size="sm" className="w-full justify-start gap-2">
          <Upload className="h-3.5 w-3.5" />
          Upload document
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search library…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {activeDocId && (
        <div className="px-3 py-2 border-b border-border bg-accent/20 animate-fade-in">
          <div className="flex items-center gap-2 text-[11px] font-medium text-primary">
            <Paperclip className="h-3 w-3" /> Active context
            <button onClick={() => onAttach(null)} className="ml-auto p-1 rounded hover:bg-background/60" title="Detach">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="text-xs truncate mt-0.5">
            {docs.find((d) => d.id === activeDocId)?.file_name ?? "Attached document"}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="px-2 py-4 text-xs text-muted-foreground">Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="m-2 p-4 rounded-xl border border-dashed border-border text-center">
            <FileText className="h-6 w-6 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-xs text-muted-foreground">
              {docs.length === 0 ? "No documents yet." : `No matches for "${q}".`}
            </p>
            {docs.length === 0 && (
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Upload a PDF or image to give Nextudy context.
              </p>
            )}
          </div>
        )}
        {!loading && filtered.map((d, i) => {
          const active = d.id === activeDocId;
          const isImage = /\.(png|jpe?g|webp|gif|heic)$/i.test(d.file_name);
          const Icon = isImage ? ImageIcon : FileText;
          return (
            <button
              key={d.id}
              onClick={() => onAttach({ id: d.id, name: d.file_name })}
              style={{ animationDelay: `${i * 30}ms` }}
              className={`w-full text-left rounded-lg p-2.5 border transition-all animate-fade-in group ${
                active
                  ? "border-primary/50 bg-primary/10 shadow-sm"
                  : "border-transparent hover:border-border hover:bg-accent/30"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`h-8 w-8 shrink-0 rounded-md grid place-items-center ${
                  active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{d.file_name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span className="capitalize">{d.status ?? "ready"}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {!isPro && (
        <div className="m-3 p-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <Lock className="h-3 w-3" /> Multi-file context
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Attach multiple documents at once with Nextudy Pro.
          </p>
          <Link
            to="/"
            className="inline-block mt-2 text-[11px] font-medium text-primary hover:underline"
          >
            Upgrade →
          </Link>
        </div>
      )}
    </aside>
  );
}
