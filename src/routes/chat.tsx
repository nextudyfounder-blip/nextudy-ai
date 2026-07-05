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
import { ContextPanel } from "@/components/chat/ContextPanel";
import {
  Send, Plus, Loader2, Sparkles, Paperclip, X, Mic, MicOff,
  ThumbsUp, ThumbsDown, Copy, Share2, Wand2, ShieldCheck,
  MessageSquarePlus, MoreHorizontal, Pencil, Trash2, Brain,
  Search, Image as ImageIcon,
  Pin, PinOff, Maximize2, Minimize2, Keyboard, ChevronDown, Zap,
  PanelLeftOpen, Settings2,
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const TEMPLATES = [
  { title: "Summarize", prompt: "Summarize the attached document into concise bullet points, grouped by topic." },
  { title: "Explain simpler", prompt: "Explain the last concept again, but simpler — like I'm 15." },
  { title: "Quiz me", prompt: "Give me 5 multiple-choice questions from this material with answers hidden below." },
  { title: "Flashcards", prompt: "Generate 10 Q&A flashcards from the material in a table." },
  { title: "Compare & contrast", prompt: "Compare and contrast the two main ideas from this material in a table." },
  { title: "Study plan", prompt: "Create a 7-day study plan for this material with daily goals." },
];

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "AI Chat — Nextudy" }] }),
});

type Msg = { id?: string; role: "user" | "assistant"; content: string };
type Conv = { id: string; title: string; updated_at: string };

// Auto-shorten conversation titles for the sidebar list
function shortenTitle(raw: string | null | undefined, max = 34): string {
  const t = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  const stop = new Set(["a","an","the","and","or","but","of","to","in","on","for","with","is","are","how","what","why","can","you","me","my"]);
  const words = t.split(" ");
  const keep = words.filter((w, i) => i < 2 || !stop.has(w.toLowerCase())).join(" ");
  const base = keep.length < t.length ? keep : t;
  return base.length > max ? base.slice(0, max - 1).trimEnd() + "…" : base;
}


const REMINDER_KEY = "nextudy-pro-reminder";

function ChatPage() {
  const { user } = useAuth();
  const guest = useGuest();
  const navigate = useNavigate();
  const askFn = useServerFn(askChat);
  const askGuestFn = useServerFn(askChatGuest);
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
  const [search, setSearch] = useState("");
  const [pendingImage, setPendingImage] = useState<{ b64: string; mime: string; name: string } | null>(null);
  const [model, setModel] = useState<"flash" | "pro" | "thinking">("flash");
  const [focusMode, setFocusMode] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("nextudy-pinned-chats") || "[]")); } catch { return new Set(); }
  });
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setProfileName(null); return; }
    let alive = true;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (alive) setProfileName(
        (data?.display_name?.trim())
        || (user.user_metadata?.display_name as string | undefined)
        || (user.email?.split("@")[0] ?? null)
      );
    });
    return () => { alive = false; };
  }, [user]);

  const searchRef = useRef<HTMLInputElement>(null);
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
      if (false && (prof?.plan ?? "free") === "free") { // TEMP PREVIEW OVERRIDE
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
    setPendingImage(null);
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
    if (!message || busy) return;
    if (!user && !guest) return;
    const imgB64 = pendingImage?.b64 ?? null;
    const imgMime = pendingImage?.mime ?? null;
    const userBubble = pendingImage
      ? `${message}\n\n_📎 ${pendingImage.name}_`
      : message;
    setMessages((m) => [...m, { role: "user", content: userBubble }]);
    setInput("");
    setPendingImage(null);
    setBusy(true);
    try {
      if (guest) {
        const hist = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
        const res = await askGuestFn({ data: { message, history: hist, imageBase64: imgB64, imageMimeType: imgMime } });
        setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      } else {
        const res = await askFn({ data: { message, conversationId: convId, documentId: docId, imageBase64: imgB64, imageMimeType: imgMime } });
        setConvId(res.conversationId);
        setMessages((m) => {
          const next = [...m];
          const lastUser = [...next].reverse().find((x) => x.role === "user" && !x.id);
          if (lastUser && res.userMsgId) lastUser.id = res.userMsgId;
          next.push({ id: res.assistantId ?? undefined, role: "assistant", content: res.reply });
          return next;
        });
        refreshConvs();
      }
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
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }

    // Guest: attach image inline only, no DB
    if (guest) {
      if (!file.type.startsWith("image/")) {
        toast.error("Guests can only attach images. Sign up to upload PDFs.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      try {
        const b64 = await fileToBase64(file);
        setPendingImage({ b64, mime: file.type, name: file.name });
        toast.success(`🖼️ ${file.name} attached`);
      } catch {
        toast.error("Could not read image");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
      return;
    }

    if (!user) return;
    setBusy(true);
    try {
      // For images: attach as vision input AND OCR for document context
      if (file.type.startsWith("image/")) {
        const b64 = await fileToBase64(file);
        setPendingImage({ b64, mime: file.type, name: file.name });
        toast.success(`🖼️ ${file.name} attached — ask anything about it`);
        return;
      }
      let text = "";
      if (file.type === "application/pdf") {
        toast.info("Reading PDF…");
        text = await extractPdfText(file);
      } else {
        toast.error("Upload a PDF or image");
        return;
      }
      if (text.length < 20) throw new Error("Not enough text extracted");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("pdfs").upload(path, file);
      if (upErr) throw upErr;
      // Insert only required columns — let Supabase fill id/created_at/status default
      const { data: doc, error: insErr } = await supabase
        .from("documents")
        .insert({ user_id: user.id, file_name: file.name, storage_path: path })
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
  // unused (vision uses direct b64): keep ocrFn reference satisfied
  void ocrFn;

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

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("nextudy-pinned-chats", JSON.stringify([...next]));
      return next;
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
      else if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); startNewChat(); }
      else if (mod && e.key === ".") { e.preventDefault(); setFocusMode((v) => !v); }
      else if (mod && e.key === "/") { e.preventDefault(); setShortcutsOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredConvs = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, search]);

  const grouped = useMemo(() => {
    const pinnedList: Conv[] = [];
    const today: Conv[] = [];
    const week: Conv[] = [];
    const older: Conv[] = [];
    const now = Date.now();
    for (const c of filteredConvs) {
      if (pinned.has(c.id)) { pinnedList.push(c); continue; }
      const age = (now - new Date(c.updated_at).getTime()) / 86_400_000;
      if (age < 1) today.push(c);
      else if (age < 7) week.push(c);
      else older.push(c);
    }
    return { pinned: pinnedList, today, week, older };
  }, [filteredConvs, pinned]);

  return (
    <AppLayout title="" hideSidebar>
      <div className="flex h-[calc(100vh-3.5rem)] bg-gradient-to-br from-background via-background to-primary/5">
        {/* Chat-history sidebar (single primary sidebar, Gemini-style) */}
        {!focusMode && (
        <aside className="hidden md:flex flex-col w-72 border-r border-border bg-card/40 backdrop-blur">
          <div className="p-3 border-b border-border space-y-2">
            <Button onClick={startNewChat} variant="hero" className="w-full justify-start gap-2" title="New chat (Ctrl+J)">
              <MessageSquarePlus className="h-4 w-4" />
              New chat
            </Button>
            {!guest && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations… (Ctrl+K)"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-2 rounded-md border border-dashed border-border/70 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/30 transition"
              title="Attach an image or PDF"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Attach image or PDF</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4 text-sm">
            {guest ? (
              <div className="m-2 p-3 rounded-lg border border-dashed border-border bg-muted/30">
                <p className="text-xs font-medium">You're chatting as a Guest</p>
                <p className="text-[11px] text-muted-foreground mt-1">Chats aren't saved. Sign up to keep your history.</p>
                <Button size="sm" variant="hero" className="w-full mt-2" onClick={() => navigate({ to: "/auth" })}>
                  Sign up free
                </Button>
              </div>
            ) : (
              <>
                {[
                  { label: "Pinned", items: grouped.pinned, icon: Pin },
                  { label: "Today", items: grouped.today },
                  { label: "Previous 7 days", items: grouped.week },
                  { label: "Older", items: grouped.older },
                ].map(({ label, items, icon: Icon }) => items.length > 0 && (
                  <div key={label}>
                    <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      {Icon && <Icon className="h-3 w-3" />}{label}
                    </div>
                    {items.map((c) => (
                      <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-accent/40 cursor-pointer ${convId === c.id ? "bg-accent/60" : ""}`}>
                        <button onClick={() => openConv(c.id)} className="flex-1 text-left truncate flex items-center gap-1.5 min-w-0">
                          {pinned.has(c.id) && <Pin className="h-3 w-3 shrink-0 text-primary fill-primary" />}
                          <span className="truncate">{shortenTitle(c.title)}</span>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-60 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition p-1 rounded hover:bg-background" title="More"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => togglePin(c.id)}>
                              {pinned.has(c.id) ? <><PinOff className="h-3.5 w-3.5 mr-2" />Unpin conversation</> : <><Pin className="h-3.5 w-3.5 mr-2" />Pin conversation</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRename(c.id, c.title || "")}><Pencil className="h-3.5 w-3.5 mr-2" />Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4">No conversations yet. Start one below.</p>
                )}
                {conversations.length > 0 && filteredConvs.length === 0 && (
                  <div className="m-2 p-3 rounded-lg border border-border bg-card/60 animate-fade-in">
                    <p className="text-xs font-medium">No matches</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Nothing found for "{search}".</p>
                  </div>
                )}

                {/* Study Crews section (renamed from Notebooks) */}
                <div className="pt-2">
                  <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">Study Crews</div>
                  <button
                    onClick={() => navigate({ to: "/crews" })}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/40 text-left"
                  >
                    <div className="h-6 w-6 rounded-md bg-primary/10 text-primary grid place-items-center">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs">Open your Study Crews</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Compact user footer with Settings gear next to name (Gemini-style) */}
          <div className="border-t border-border p-2">
            {user ? (
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/40">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center text-white text-[11px] font-semibold shrink-0">
                  {(profileName || user.email || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{profileName || "You"}</div>
                </div>
                <button
                  onClick={() => navigate({ to: "/settings" })}
                  className="p-1.5 rounded-md hover:bg-background text-muted-foreground shrink-0"
                  title="Settings"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShortcutsOpen(true)} className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/40 flex items-center gap-2 text-xs text-muted-foreground">
                <Keyboard className="h-3.5 w-3.5" />Keyboard shortcuts
              </button>
            )}
          </div>
        </aside>
        )}


        {/* Context panel (documents) */}
        {!focusMode && contextOpen && !guest && user && (
          <ContextPanel
            userId={user.id}
            activeDocId={docId}
            onAttach={(doc) => {
              if (!doc) { setDocId(null); setDocName(null); return; }
              setDocId(doc.id);
              setDocName(doc.name);
              toast.success(`📎 ${doc.name} attached as context`);
            }}
            onUploadClick={() => fileRef.current?.click()}
            onCollapse={() => setContextOpen(false)}
          />
        )}

        {/* Main chat */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-40">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && !busy && (
                <div className="text-center pt-12 sm:pt-24 animate-fade-in">
                  <h1 className="text-4xl sm:text-5xl font-display font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Hello, {guest ? "Guest" : (profileName || "there")}
                  </h1>
                  <p className="text-2xl sm:text-3xl font-display font-semibold text-muted-foreground mt-1">
                    How can Nextudy help you study today?
                  </p>
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

          {/* Top-right floating controls */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            {!focusMode && !contextOpen && user && !guest && (
              <button
                onClick={() => setContextOpen(true)}
                title="Show context panel"
                className="hidden lg:inline-flex p-2 rounded-full bg-card/80 backdrop-blur border border-border hover:bg-accent/60 transition"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setFocusMode((v) => !v)}
              title={focusMode ? "Exit focus mode (Ctrl+.)" : "Focus mode (Ctrl+.)"}
              className="p-2 rounded-full bg-card/80 backdrop-blur border border-border hover:bg-accent/60 transition"
            >
              {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Floating input capsule */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-4 px-4">
            <div className="max-w-3xl mx-auto">
              {/* Attachment preview row */}
              {(docName || pendingImage) && (
                <div className="flex items-center gap-2 mb-3 mx-auto w-fit animate-fade-in">
                  {pendingImage ? (
                    <div className="relative group">
                      <img
                        src={`data:${pendingImage.mime};base64,${pendingImage.b64}`}
                        alt={pendingImage.name}
                        className="h-20 w-20 object-cover rounded-xl border border-border shadow-sm"
                      />
                      <button
                        onClick={() => setPendingImage(null)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 grid place-items-center rounded-full bg-foreground text-background shadow opacity-0 group-hover:opacity-100 transition"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 right-1 truncate text-[9px] text-white bg-black/60 rounded px-1 py-0.5">
                        {pendingImage.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs bg-accent/20 border border-accent/40 rounded-full px-3 py-1.5">
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{docName}</span>
                      <button onClick={() => { setDocId(null); setDocName(null); }} className="hover:text-foreground"><X className="h-3 w-3" /></button>
                    </div>
                  )}
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="rounded-[28px] border border-border bg-card shadow-elegant px-2 py-2 focus-within:border-primary/40 focus-within:shadow-glow transition-all"
              >
                <input ref={fileRef} type="file" accept={guest ? "image/*" : "application/pdf,image/*"} className="hidden" onChange={onFile} />

                {/* Textarea row */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder="Ask Nextudy anything…"
                  rows={1}
                  className="w-full bg-transparent resize-none outline-none px-3 py-2 text-sm min-h-[40px] max-h-[200px]"
                  disabled={busy}
                />

                {/* Controls row: model left, mic + send right */}
                <div className="flex items-center gap-1 px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0 h-9 w-9" disabled={busy} title="Attach">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top">
                      <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                        <Paperclip className="h-3.5 w-3.5 mr-2" />
                        {guest ? "Upload image" : "Upload PDF or image"}
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled className="opacity-60">
                        <ImageIcon className="h-3.5 w-3.5 mr-2" />
                        Image Generation
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">Soon</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Model selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium hover:bg-accent/40 transition text-foreground/80"
                        title="Model"
                      >
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        {model === "flash" ? "Flash" : model === "pro" ? "Pro" : "Thinking"}
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-56">
                      <DropdownMenuLabel>Choose model</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setModel("flash")}>
                        <Zap className="h-3.5 w-3.5 mr-2 text-primary" />
                        <div className="flex-1">
                          <div className="text-sm">Flash</div>
                          <div className="text-[10px] text-muted-foreground">Fastest, balanced quality</div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setModel("pro")} className="opacity-60">
                        <Sparkles className="h-3.5 w-3.5 mr-2" />
                        <div className="flex-1">
                          <div className="text-sm">Pro</div>
                          <div className="text-[10px] text-muted-foreground">Deeper reasoning · Soon</div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setModel("thinking")} className="opacity-60">
                        <Brain className="h-3.5 w-3.5 mr-2" />
                        <div className="flex-1">
                          <div className="text-sm">Thinking</div>
                          <div className="text-[10px] text-muted-foreground">Step-by-step · Soon</div>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    type="button" variant="ghost" size="icon"
                    className="rounded-full shrink-0 h-9 w-9"
                    onClick={() => navigate({ to: "/settings" })}
                    disabled={busy}
                    title="Chat settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>


                  <div className="flex-1" />


                  <Button type="button" variant="ghost" size="icon" className={`rounded-full shrink-0 h-9 w-9 ${listening ? "text-red-500 animate-pulse" : ""}`} onClick={toggleMic} disabled={busy} title="Voice input">
                    {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    type="submit"
                    size="icon"
                    className={`rounded-full shrink-0 h-9 w-9 transition-all ${input.trim() ? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white scale-100" : "bg-muted text-muted-foreground scale-90"}`}
                    disabled={busy || !input.trim()}
                    title="Send"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Nextudy can make mistakes. Double-check important facts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Keyboard className="h-5 w-5" /> Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              { keys: ["Ctrl", "K"], label: "Search chats" },
              { keys: ["Ctrl", "J"], label: "New chat" },
              { keys: ["Ctrl", "."], label: "Toggle focus mode" },
              { keys: ["Ctrl", "/"], label: "Show this dialog" },
              { keys: ["Enter"], label: "Send message" },
              { keys: ["Shift", "Enter"], label: "New line" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="flex gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className="px-2 py-0.5 rounded bg-muted border border-border text-xs font-mono">{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
