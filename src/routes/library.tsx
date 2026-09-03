import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookMarked, FileText, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PenLoader } from "@/components/PenLoader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Saved Library — Nextudy study material" },
      { name: "description", content: "Every summary, question set and uploaded document you saved in Nextudy, in one searchable library." },
      { property: "og:title", content: "Saved Library — Nextudy" },
      { property: "og:description", content: "Revisit your saved summaries, practice questions and uploads any time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Row = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  summary: string | null;
};

function LibraryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) { setRows([]); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, file_name, status, created_at, summary")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (active) setRows((data ?? []) as Row[]);
    })();
    return () => { active = false; };
  }, [user]);

  return (
    <AppLayout title="Saved Library">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-realm" /> Saved Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Everything you uploaded and summarized, newest first.
          </p>
        </header>

        {rows === null ? (
          <PenLoader label="Opening your library…" />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Your library is still empty.</p>
            <Button asChild variant="hero" size="sm">
              <Link to="/dashboard">Upload your first document <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to="/dashboard"
                  className="flex items-start gap-3 rounded-xl border border-border p-4 hover:bg-muted/40 transition"
                >
                  <FileText className="h-4 w-4 mt-0.5 text-realm shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{r.file_name}</span>
                    <span className="block text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {r.summary?.slice(0, 180) ?? `Status: ${r.status}`}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
