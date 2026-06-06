import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { askChat } from "@/lib/chat.functions";
import { processPdf } from "@/lib/process-pdf.functions";
import { ocrImage } from "@/lib/ocr.functions";
import { extractPdfText } from "@/lib/pdf-extract";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Send, Plus, Loader2, Bot, User as UserIcon, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "AI Chat — Nextudy" }] }),
});

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Explain photosynthesis in simple terms",
  "Help me solve x² + 5x + 6 = 0",
  "Summarize my latest PDF",
  "Quiz me on the French revolution",
];

function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const askFn = useServerFn(askChat);
  const processFn = useServerFn(processPdf);
  const ocrFn = useServerFn(ocrImage);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy || !user) return;
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await askFn({ data: { message, conversationId: convId, documentId: docId } });
      setConvId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string).split(",")[1] ?? "");
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }
    setBusy(true);
    try {
      let text = "";
      if (file.type === "application/pdf") {
        toast.info("Extracting PDF…");
        text = await extractPdfText(file);
      } else if (file.type.startsWith("image/")) {
        toast.info("Reading image…");
        const b64 = await fileToBase64(file);
        const r = await ocrFn({ data: { imageBase64: b64, mimeType: file.type as "image/png" } });
        text = r.text;
      } else {
        toast.error("Upload a PDF or image");
        return;
      }
      if (text.length < 20) throw new Error("Not enough text extracted");

      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("pdfs").upload(path, file);
      if (upErr) throw upErr;
      const { data: doc, error: insErr } = await supabase
        .from("documents")
        .insert({ user_id: user.id, file_name: file.name, storage_path: path, status: "pending" })
        .select("id").single();
      if (insErr) throw insErr;
      await processFn({ data: { documentId: doc.id, text } });
      setDocId(doc.id);
      setDocName(file.name);
      toast.success(`📎 ${file.name} attached — ask me anything about it!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AppLayout title="AI Chat">
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 animate-fade-in">
                <div className="h-14 w-14 rounded-2xl bg-gradient-accent shadow-glow grid place-items-center mx-auto mb-4">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-display font-bold">Ask Nextudy anything</h2>
                <p className="text-muted-foreground mt-2">Math, biology, history, code — any subject.</p>
                <div className="grid sm:grid-cols-2 gap-2 mt-8 max-w-xl mx-auto">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-sm rounded-xl border border-border bg-card p-3 hover:shadow-elegant hover:scale-[1.02] transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 animate-fade-in ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-gradient-accent grid place-items-center shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                }`}>
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex gap-3 animate-fade-in">
                <div className="h-8 w-8 rounded-lg bg-gradient-accent grid place-items-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background/80 backdrop-blur px-4 sm:px-6 py-4">
          <div className="max-w-3xl mx-auto">
            {docName && (
              <div className="flex items-center gap-2 mb-2 text-xs bg-accent/10 border border-accent/30 rounded-lg px-3 py-1.5 w-fit animate-fade-in">
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{docName}</span>
                <button onClick={() => { setDocId(null); setDocName(null); }} className="hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:ring-2 focus-within:ring-primary/30 transition-all"
            >
              <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                title="Upload PDF or photo"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                placeholder="Message Nextudy…"
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none px-2 py-2 text-sm min-h-[40px] max-h-32"
                disabled={busy}
              />
              <Button type="submit" variant="hero" size="icon" disabled={busy || !input.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Nextudy can make mistakes. Always double-check important facts.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
