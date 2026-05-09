import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { askChat, listConversations, getConversation, deleteConversation } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Trash2, Bot, User, Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "AI Chat — Nextudy" }] }),
});

interface Msg { id?: string; role: "user" | "assistant"; content: string }
interface Conv { id: string; title: string; updated_at: string }

function ChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const ask = useServerFn(askChat);
  const listFn = useServerFn(listConversations);
  const getFn = useServerFn(getConversation);
  const delFn = useServerFn(deleteConversation);

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const refreshList = () => {
    listFn().then((r) => setConversations(r.conversations as Conv[])).catch(() => {});
  };

  useEffect(() => {
    if (user) refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    getFn({ data: { conversationId: activeId } })
      .then((r) => setMessages(r.messages as Msg[]))
      .catch(() => setMessages([]));
  }, [activeId, getFn]);

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
      const res = await ask({ data: { message: text, conversationId: activeId } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (!activeId) setActiveId(res.conversationId);
      refreshList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat failed";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => { setActiveId(null); setMessages([]); };

  const sendStarter = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const evt = new Event("submit");
      // trigger send directly
      (async () => {
        if (busy) return;
        setMessages((m) => [...m, { role: "user", content: text }]);
        setInput("");
        setBusy(true);
        try {
          const res = await ask({ data: { message: text, conversationId: activeId } });
          setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
          if (!activeId) setActiveId(res.conversationId);
          refreshList();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Chat failed";
          toast.error(msg);
        } finally { setBusy(false); }
      })();
    }, 0);
  };

  const starters = [
    "Summarize my latest PDF",
    "Explain photosynthesis simply",
    "Help me study for my math exam",
    "Quiz me on what I uploaded",
  ];

  const removeConv = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    await delFn({ data: { conversationId: id } });
    if (activeId === id) newChat();
    refreshList();
  };

  return (
    <AppLayout title="AI Chat">
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Conversations panel */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/30">
          <div className="p-3">
            <Button variant="hero" size="sm" className="w-full" onClick={newChat}>
              <Plus className="h-4 w-4 mr-2" />New chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-3 space-y-1">
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">No chats yet</p>
              )}
              {conversations.map((c) => (
                <div key={c.id} className={`group flex items-center gap-1 rounded-lg ${activeId === c.id ? "bg-primary/10" : "hover:bg-muted"}`}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className="flex-1 text-left px-3 py-2 text-sm truncate flex items-center gap-2 min-w-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    onClick={() => removeConv(c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="md:hidden flex items-center gap-2 p-2 border-b border-border">
            <Button variant="outline" size="sm" onClick={newChat}><Plus className="h-4 w-4 mr-1" />New</Button>
            <select
              value={activeId ?? ""}
              onChange={(e) => setActiveId(e.target.value || null)}
              className="flex-1 text-sm rounded-md border border-border bg-background px-2 py-1.5"
            >
              <option value="">— New chat —</option>
              {conversations.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16 space-y-3">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow">
                    <Bot className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-xl font-display font-bold">Ask me anything</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    I know your uploaded documents and can help with any study topic.
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
                  <div className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                  }`}>{m.content}</div>
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
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything about your studies…"
                rows={1}
                className="resize-none max-h-40"
                disabled={busy || loading || !user}
              />
              <Button variant="hero" size="icon" onClick={send} disabled={busy || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
