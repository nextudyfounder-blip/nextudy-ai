import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { askChat, getChatHistory, clearChat } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ArrowLeft, Send, Loader2, Trash2, Bot, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "AI Chat — Nextudy" }] }),
});

interface Msg { id?: string; role: "user" | "assistant"; content: string }

function ChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const ask = useServerFn(askChat);
  const loadHistory = useServerFn(getChatHistory);
  const clear = useServerFn(clearChat);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    loadHistory().then((r) => setMessages(r.messages as Msg[])).catch(() => {});
  }, [user, loadHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { message: text } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat failed";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear chat history?")) return;
    await clear();
    setMessages([]);
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Link to="/" className="flex items-center gap-2 font-display font-bold">
              <span className="h-8 w-8 rounded-lg bg-gradient-accent shadow-glow flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              AI Chat
            </Link>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-2" />Clear
            </Button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-display font-bold">Ask me anything</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                I know your uploaded documents and can help with any study topic — explanations, summaries, quiz questions and more.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-accent grid place-items-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="h-8 w-8 shrink-0 rounded-lg bg-muted grid place-items-center">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-accent grid place-items-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card/40 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask anything about your studies…"
            rows={1}
            className="resize-none max-h-40"
            disabled={busy}
          />
          <Button variant="hero" size="icon" onClick={send} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
