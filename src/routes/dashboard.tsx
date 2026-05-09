import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/pdf-extract";
import { useServerFn } from "@tanstack/react-start";
import { processPdf } from "@/lib/process-pdf.functions";
import { ocrImage } from "@/lib/ocr.functions";
import { getDailyUsage } from "@/lib/usage.functions";
import { AppLayout } from "@/components/AppLayout";

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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ uploads: number; questions: number; plan: string; limits: { uploads: number; questions: number } }>({ uploads: 0, questions: 0, plan: "free", limits: { uploads: 5, questions: 20 } });
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const processPdfFn = useServerFn(processPdf);
  const ocrImageFn = useServerFn(ocrImage);
  const usageFn = useServerFn(getDailyUsage);

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

  const refreshUsage = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const u = await usageFn();
      if (u) setUsage({
        uploads: u.uploads ?? 0,
        questions: u.questions ?? 0,
        plan: u.plan ?? "free",
        limits: { uploads: u.limits?.uploads ?? 5, questions: u.limits?.questions ?? 20 },
      });
    } catch (e) {
      console.warn("usage fetch failed", e);
    }
  }, [usageFn]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, plan, uploads_this_month")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
    loadDocs(user.id);
    refreshUsage();
  }, [user, loadDocs, refreshUsage]);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const processUpload = async (file: File, kind: "pdf" | "image") => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20MB)");
      return;
    }
    setBusy(true);
    try {
      let text = "";
      if (kind === "pdf") {
        setProgress("Extracting text…");
        text = await extractPdfText(file);
        if (text.length < 20) throw new Error("Could not extract enough text from this PDF");
      } else {
        setProgress("Reading image with AI…");
        const base64 = await fileToBase64(file);
        const r = await ocrImageFn({ data: { imageBase64: base64, mimeType: file.type as "image/png" } });
        text = r.text;
      }

      setProgress("Uploading…");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const bucket = kind === "pdf" ? "pdfs" : "pdfs";
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
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
      refreshUsage();
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
      if (pdfRef.current) pdfRef.current.value = "";
      if (imgRef.current) imgRef.current.value = "";
    }
  };

  const handlePdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Please upload a PDF file"); return; }
    processUpload(f, "pdf");
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    processUpload(f, "image");
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const active = docs.find((d) => d.id === activeId) ?? null;
  const recent = docs.slice(0, 3);
  const isFree = (usage?.plan ?? "free") === "free";
  const uploadsLeft = isFree ? Math.max(0, (usage?.limits.uploads ?? 5) - (usage?.uploads ?? 0)) : Infinity;

  const shareSummary = async () => {
    if (!active?.summary) return;
    const text = `📚 ${active.file_name} — Nextudy summary:\n\n${active.summary.map((b) => `• ${b}`).join("\n")}\n\nStudy smarter with Nextudy →`;
    if (navigator.share) {
      try { await navigator.share({ title: active.file_name, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Summary copied to clipboard!");
    }
  };

  return (
    <AppLayout title="Dashboard">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-display font-bold">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-2">Upload a PDF or photo and get an instant summary with practice questions.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Plan</p>
            <p className="text-xl font-display font-bold capitalize mt-1">{usage?.plan ?? "free"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Uploads today</p>
            <p className="text-xl font-display font-bold mt-1">
              {usage?.uploads ?? 0}{isFree && <span className="text-muted-foreground text-base">/{usage?.limits.uploads ?? 5}</span>}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Questions today</p>
            <p className="text-xl font-display font-bold mt-1">
              {usage?.questions ?? 0}{isFree && <span className="text-muted-foreground text-base">/{usage?.limits.questions ?? 20}</span>}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total docs</p>
            <p className="text-xl font-display font-bold mt-1">{docs.length}</p>
          </div>
        </div>

        {recent.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recently studied</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {recent.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActiveId(d.id)}
                  className="text-left rounded-xl border border-border bg-card p-4 hover:shadow-elegant transition-smooth"
                >
                  <FileText className="h-5 w-5 text-accent mb-2" />
                  <p className="text-sm font-medium truncate">{d.file_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(d.created_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 sm:p-10 text-center bg-card/40">
          <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdf} disabled={busy} />
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={busy} />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">Add study material</p>
          <p className="text-sm text-muted-foreground mt-1">
            PDF or photo of textbook / handwritten notes · Max 20MB
            {isFree && uploadsLeft <= 2 && uploadsLeft > 0 && (
              <span className="block mt-1 text-accent">{uploadsLeft} upload{uploadsLeft === 1 ? "" : "s"} left today</span>
            )}
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="hero" onClick={() => pdfRef.current?.click()} disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{progress || "Working…"}</> : <><FileText className="h-4 w-4 mr-2" />Upload PDF</>}
            </Button>
            <Button variant="outline" onClick={() => imgRef.current?.click()} disabled={busy}>
              <ImageIcon className="h-4 w-4 mr-2" />Upload photo
            </Button>
          </div>
        </div>

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
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-display font-bold">{active.file_name}</h3>
                    {active.summary && active.summary.length > 0 && (
                      <Button variant="outline" size="sm" onClick={shareSummary}>Share</Button>
                    )}
                  </div>
                  {active.error && <p className="text-sm text-destructive mt-2">{active.error}</p>}

                  {active.summary && active.summary.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-6">
                      <h4 className="font-display font-semibold text-lg mb-4">Summary</h4>
                      <ul className="space-y-2 list-disc pl-5 text-sm leading-relaxed">
                        {active.summary.map((b, i) => (<li key={i}>{b}</li>))}
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
    </AppLayout>
  );
}
