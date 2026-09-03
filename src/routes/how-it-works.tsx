import { createFileRoute, Link } from "@tanstack/react-router";
import { Upload, Sparkles, Mountain, BookMarked, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorksPage,
  head: () => ({
    meta: [
      { title: "How Nextudy works — tutorial" },
      { name: "description", content: "A short tutorial: upload notes, get AI summaries and questions, study in the Mentor Hub or build ventures in the Vanguard Hub." },
      { property: "og:title", content: "How Nextudy works" },
      { property: "og:description", content: "Learn the Nextudy flow in four steps: upload, summarize, practice, and build." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STEPS = [
  {
    icon: Upload,
    title: "1. Upload your material",
    body: "Drop in a PDF or a photo of your notes. Nextudy reads printed text and handwriting, then stores the file in your library.",
  },
  {
    icon: Sparkles,
    title: "2. Get summaries & questions",
    body: "Each upload becomes a clean summary plus practice questions tuned to your education level and preferred response style.",
  },
  {
    icon: Mountain,
    title: "3. Pick your hub",
    body: "Mentor Realm is your study partner for explanations and exam prep. Vanguard Realm is your blunt business co-founder for venture planning and Launch Blueprints.",
  },
  {
    icon: BookMarked,
    title: "4. Come back to your library",
    body: "Saved Library keeps every summary and question set, so revision never starts from scratch.",
  },
];

function HowItWorksPage() {
  return (
    <AppLayout title="How it works">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-display font-bold">How Nextudy works</h1>
          <p className="text-sm text-muted-foreground">Four steps from raw notes to real understanding.</p>
        </header>

        <ol className="space-y-3">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-xl border border-border p-5 flex gap-4">
              <span className="h-9 w-9 rounded-lg border border-border grid place-items-center shrink-0">
                <Icon className="h-4 w-4 text-realm" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-muted-foreground mt-1">{body}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="hero" size="sm">
            <Link to="/dashboard">Start uploading <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/chat">Open the AI hub</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
