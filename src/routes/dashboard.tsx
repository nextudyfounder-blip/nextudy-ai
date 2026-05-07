import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Upload, FileText, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/pdf-extract";
import { useServerFn } from "@tanstack/react-start";
import { processPdf } from "@/lib/process-pdf.functions";
import { ocrImage } from "@/lib/ocr.functions";
import { getDailyUsage } from "@/lib/usage.functions";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Nextudy" }] }),
});

interface Profile {
  display_name: string | null;
  plan: string;
  uploads_this_month: number;
}

interface DocumentRow {
  id: string;
  file_name: string;
  status: string;
  error: string | null;
  summary: string[] | null;
  questions: { question: string; answer: string }[] | null;
  created_at: string;
}

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const processPdfFn = useServerFn(processPdf);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const loadDocs = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("documents")
      .select("id, file_name, status, error, summary, questions, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as DocumentRow[]);
    if (data && data.length && !activeId) setActiveId(data[0].id);
  }, [activeId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, plan, uploads_this_month")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
    loadDocs(user.id);
  }, [user, loadDocs]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20MB)");
      return;
    }

    setBusy(true);
    try {
      setProgress("Extracting text…");
      const text = await extractPdfText(file);
      if (text.length < 20) throw new Error("Could not extract enough text from this PDF");

      setProgress("Uploading…");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("pdfs").upload(path, file);
      if (upErr) throw upErr;

      const { data: doc, error: insErr } = await supabase
        .from("documents")
        .insert({ user_id: user.id, file_name: file.name, storage_path: path, status: "pending" })
        .select("id")
        .single();
      if (insErr) throw insErr;

      setProgress("Generating summary & questions…");
      await processPdfFn({ data: { documentId: doc.id, text } });

      toast.success("Done! Summary ready.");
      setActiveId(doc.id);
      await loadDocs(user.id);
      // refresh profile counter
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, plan, uploads_this_month")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(p);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const active = docs.find((d) => d.id === activeId) ?? null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="h-8 w-8 rounded-lg bg-gradient-accent shadow-glow flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            Nextudy
          </Link>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-display font-bold">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-2">Upload a PDF and get an instant summary with practice questions.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="text-2xl font-display font-bold capitalize mt-1">{profile?.plan ?? "free"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Uploads this month</p>
            <p className="text-2xl font-display font-bold mt-1">{profile?.uploads_this_month ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium mt-1 truncate">{user.email}</p>
          </div>
        </div>

        {/* Upload */}
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center bg-card/40">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFile}
            disabled={busy}
          />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">Upload a study PDF</p>
          <p className="text-sm text-muted-foreground mt-1">Max 20MB · 50 pages</p>
          <Button
            variant="hero"
            className="mt-5"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{progress || "Working…"}</>
            ) : (
              <>Choose PDF</>
            )}
          </Button>
        </div>

        {/* Documents */}
        {docs.length > 0 && (
          <div className="mt-12 grid lg:grid-cols-[260px_1fr] gap-6">
            <aside className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your documents</h2>
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActiveId(d.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-smooth ${
                    activeId === d.id ? "border-primary bg-primary/5" : "border-border hover:bg-card"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {d.status === "ready" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        {d.status === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                        {d.status === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {d.status}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </aside>

            <section>
              {active ? (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-display font-bold">{active.file_name}</h3>
                    {active.error && (
                      <p className="text-sm text-destructive mt-2">{active.error}</p>
                    )}
                  </div>

                  {active.summary && active.summary.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-6">
                      <h4 className="font-display font-semibold text-lg mb-4">Summary</h4>
                      <ul className="space-y-2 list-disc pl-5 text-sm leading-relaxed">
                        {active.summary.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {active.questions && active.questions.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-6">
                      <h4 className="font-display font-semibold text-lg mb-4">Practice questions</h4>
                      <ol className="space-y-5 list-decimal pl-5">
                        {active.questions.map((q, i) => (
                          <li key={i} className="text-sm">
                            <p className="font-medium">{q.question}</p>
                            <p className="text-muted-foreground mt-1">{q.answer}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {active.status === "processing" && (
                    <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Select a document.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
