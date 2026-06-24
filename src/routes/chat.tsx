import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/hooks/useGuest";
import { useServerFn } from "@tanstack/react-start";
import {
  askChat,
  askChatGuest,
  listConversations,
  getConversation,
  deleteConversation,
  renameConversation,
  modifyResponse,
} from "@/lib/chat.functions";
import { processPdf } from "@/lib/process-pdf.functions";
import { ocrImage } from "@/lib/ocr.functions";
import { extractPdfText } from "@/lib/pdf-extract";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Markdown } from "@/components/chat/Markdown";
import {
  Send, Plus, Loader2, Sparkles, Paperclip, X, Mic, MicOff,
  ThumbsUp, ThumbsDown, Copy, Share2, Wand2, ShieldCheck,
  MessageSquarePlus, MoreHorizontal, Pencil, Trash2, BookOpen,
  Code2, Brain, FileText, Search, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "AI Chat — Nextudy" }] }),
});

type Msg = { id?: string; role: "user" | "assistant"; content: string };
type Conv = { id: string; title: string; updated_at: string };

const STARTERS = [
  { icon: Brain, title: "Explain a complex topic", prompt: "Explain quantum entanglement in simple terms with an analogy." },
  { icon: Code2, title: "Code a Python script", prompt: "Write a Python script that reads a CSV and plots the data." },
  { icon: BookOpen, title: "Quiz me on biology", prompt: "Quiz me on the human circulatory system. Ask 5 multiple-choice questions." },
  { icon: FileText, title: "Summarize my notes", prompt: "Summarize the key concepts from my most recent uploaded document." },
];

const REMINDER_KEY = "nextudy-pro-reminder";

function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const askFn = useServerFn(askChat);
  const listFn = useServerFn(listConversations);
  const getFn = useServerFn(getConversation);
  const delFn = useServerFn(deleteConversation);
  const renameFn = useServerFn(renameConversation);
  const modifyFn = useServerFn(modifyResponse);
  const processFn = useServerFn(processPdf);
  const ocrFn = useServerFn(ocrImage);

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recogRef = useRef<unknown>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // Focus on mount
  useEffect(() => { textareaRef.current?.focus(); }, [convId]);

  // Load conversations
  const refreshConvs = async () => {
    try {
      const res = await listFn();
      setConversations(res.conversations);
    } catch { /* ignore */ }
  };
  useEffect(() => { if (user) refreshConvs(); }, [user]);

  // Daily Pro reminder
  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const lastShown = localStorage.getItem(REMINDER_KEY);
      if (lastShown === today) return;
      const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
      if ((prof?.plan ?? "free") === "free") {
        setTimeout(() => {
          toast("✨ Unlock unlimited AI with Nextudy Pro", {
            description: "Free plan limited to 20 questions/day. Upgrade for unlimited chats & uploads.",
            action: { label: "View plans", onClick: () => navigate({ to: "/" }) },
            duration: 8000,
          });
          localStorage.setItem(REMINDER_KEY, today);
        }, 1500);
      }
    })();
  }, [user, navigate]);

  const startNewChat = () => {
    setMessages([]);
    setConvId(null);
    setDocId(null);
    setDocName(null);
    textareaRef.current?.focus();
  };

  const openConv = async (id: string) => {
    setConvId(id);
    setBusy(true);
    try {
      const res = await getFn({ data: { conversationId: id } });
      setMessages(res.messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load chat");
    } finally {
      setBusy(false);
    }
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy || !user) return;
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await askFn({ data: { message, conversationId: convId, documentId: docId } });
      setConvId(res.conversationId);
      setMessages((m) => {
        const next = [...m];
        const lastUser = [...next].reverse().find((x) => x.role === "user" && !x.id);
        if (lastUser && res.userMsgId) lastUser.id = res.userMsgId;
        next.push({ id: res.assistantId ?? undefined, role: "assistant", content: res.reply });
        return next;
      });
      refreshConvs();
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
        toast.info("Reading PDF…");
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
      toast.success(`📎 ${file.name} attached`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Voice input
  const toggleMic = () => {
    type SR = { new(): { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start(): void; stop(): void } };
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: SR }).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("Voice not supported in this browser"); return; }
    if (listening) {
      (recogRef.current as { stop: () => void } | null)?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recogRef.current = rec;
    setListening(true);
  };

  const handleModify = async (messageId: string | undefined, style: "shorter" | "longer" | "simpler" | "casual" | "professional") => {
    if (!messageId) return;
    setBusy(true);
    try {
      const res = await modifyFn({ data: { messageId, style } });
      setMessages((m) => m.map((x) => x.id === messageId ? { ...x, content: res.content } : x));
      toast.success("Response updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not modify");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const shareGmail = (text: string) => {
    const body = encodeURIComponent(text);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=Nextudy%20answer&body=${body}`, "_blank");
  };
  const shareDocs = (text: string) => {
    // Open new Google Doc and copy text for user to paste
    navigator.clipboard.writeText(text);
    toast.success("Copied! Paste into your new doc.");
    window.open("https://docs.new", "_blank");
  };

  const doubleCheck = () => {
    toast.success("Fact-check tip", {
      description: "Nextudy can make mistakes. Verify with trusted sources like textbooks or scholarly databases.",
      duration: 6000,
    });
  };

  const handleRename = async (id: string, current: string) => {
    const next = window.prompt("Rename chat", current);
    if (!next || next.trim() === current) return;
    try {
      await renameFn({ data: { conversationId: id, title: next.trim() } });
      refreshConvs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this chat?")) return;
    try {
      await delFn({ data: { conversationId: id } });
      if (convId === id) startNewChat();
      refreshConvs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const grouped = useMemo(() => {
    const today: Conv[] = [];
    const week: Conv[] = [];
    const older: Conv[] = [];
    const now = Date.now();
    for (const c of conversations) {
      const age = (now - new Date(c.updated_at).getTime()) / 86_400_000;
      if (age < 1) today.push(c);
      else if (age < 7) week.push(c);
      else older.push(c);
    }
    return { today, week, older };
  }, [conversations]);

  return (
    <AppLayout title="">
      <div className="flex h-[calc(100vh-3.5rem)] bg-gradient-to-br from-background via-background to-primary/5">
        {/* Chat-history sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/40 backdrop-blur">
          <div className="p-3 border-b border-border">
            <Button onClick={startNewChat} variant="hero" className="w-full justify-start gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4 text-sm">
            {[
              { label: "Today", items: grouped.today },
              { label: "Previous 7 days", items: grouped.week },
              { label: "Older", items: grouped.older },
            ].map(({ label, items }) => items.length > 0 && (
              <div key={label}>
                <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
                {items.map((c) => (
                  <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-accent/40 cursor-pointer ${convId === c.id ? "bg-accent/60" : ""}`}>
                    <button onClick={() => openConv(c.id)} className="flex-1 text-left truncate">
                      {c.title || "Untitled chat"}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-background"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRename(c.id, c.title || "")}><Pencil className="h-3.5 w-3.5 mr-2" />Rename</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4">No chats yet. Start one below.</p>
            )}
          </div>
          <div className="border-t border-border p-2 text-xs text-muted-foreground space-y-1">
            <button onClick={() => navigate({ to: "/profile" })} className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/40">Settings</button>
            <button onClick={() => navigate({ to: "/feedback" })} className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/40">Help & Feedback</button>
            <button onClick={() => navigate({ to: "/dashboard" })} className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/40">Activity</button>
          </div>
        </aside>

        {/* Main chat */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-40">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && !busy && (
                <div className="text-center pt-12 sm:pt-20 animate-fade-in">
                  <h1 className="text-4xl sm:text-5xl font-display font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Hello{user?.email ? `, ${user.email.split("@")[0]}` : ""}
                  </h1>
                  <p className="text-2xl sm:text-3xl font-display font-semibold text-muted-foreground mt-1">
                    How can Nextudy help you study today?
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-12 max-w-2xl mx-auto">
                    {STARTERS.map((s) => (
                      <button
                        key={s.title}
                        onClick={() => send(s.prompt)}
                        className="group text-left rounded-2xl border border-border bg-card/60 backdrop-blur p-4 hover:border-primary/40 hover:shadow-elegant transition-all"
                      >
                        <s.icon className="h-5 w-5 text-primary mb-3 group-hover:scale-110 transition-transform" />
                        <div className="text-sm font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.prompt}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={m.id ?? i} className="animate-fade-in">
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Markdown content={m.content} />
                        {m.id && (
                          <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                            <IconBtn title="Good response" onClick={() => toast.success("Thanks for the feedback!")}><ThumbsUp className="h-3.5 w-3.5" /></IconBtn>
                            <IconBtn title="Bad response" onClick={() => toast("We'll improve!")}><ThumbsDown className="h-3.5 w-3.5" /></IconBtn>
                            <IconBtn title="Copy" onClick={() => copy(m.content)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-md hover:bg-accent/40 transition" title="Modify response"><Wand2 className="h-3.5 w-3.5" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Modify response</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {(["shorter", "longer", "simpler", "casual", "professional"] as const).map((s) => (
                                  <DropdownMenuItem key={s} onClick={() => handleModify(m.id, s)} className="capitalize">{s}</DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-md hover:bg-accent/40 transition" title="Share & Export"><Share2 className="h-3.5 w-3.5" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => shareGmail(m.content)}>Send via Gmail</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => shareDocs(m.content)}>Export to Google Docs</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <IconBtn title="Double-check" onClick={doubleCheck}><ShieldCheck className="h-3.5 w-3.5" /></IconBtn>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {busy && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center animate-pulse">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-2 max-w-xl">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Floating input capsule */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-4 px-4">
            <div className="max-w-3xl mx-auto">
              {docName && (
                <div className="flex items-center gap-2 mb-2 text-xs bg-accent/20 border border-accent/40 rounded-full px-3 py-1.5 w-fit animate-fade-in mx-auto">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{docName}</span>
                  <button onClick={() => { setDocId(null); setDocName(null); }} className="hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex items-end gap-1 rounded-3xl border border-border bg-card shadow-elegant px-3 py-2 focus-within:border-primary/40 focus-within:shadow-glow transition-all"
              >
                <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
                <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => fileRef.current?.click()} disabled={busy} title="Attach PDF or image">
                  <Plus className="h-5 w-5" />
                </Button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder="Ask Nextudy anything…"
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none px-2 py-2.5 text-sm min-h-[40px] max-h-[200px]"
                  disabled={busy}
                />
                <Button type="button" variant="ghost" size="icon" className={`rounded-full shrink-0 ${listening ? "text-red-500 animate-pulse" : ""}`} onClick={toggleMic} disabled={busy} title="Voice input">
                  {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className={`rounded-full shrink-0 transition-all ${input.trim() ? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white scale-100" : "bg-muted text-muted-foreground scale-90"}`}
                  disabled={busy || !input.trim()}
                  title="Send"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Nextudy can make mistakes. Double-check important facts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 rounded-md hover:bg-accent/40 transition">
      {children}
    </button>
  );
}
