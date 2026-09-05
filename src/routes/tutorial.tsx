import { createFileRoute, Link } from "@tanstack/react-router";
import { Upload, Sparkles, Mountain, FileDown, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tutorial")({
  component: TutorialPage,
  head: () => ({
    meta: [
      { title: "Tutorial — get started with Nextudy" },
      { name: "description", content: "A four-step Nextudy tutorial: attach a PDF or photo, ask questions, switch hubs and export your chat as a PDF." },
      { property: "og:title", content: "Nextudy tutorial" },
      { property: "og:description", content: "Learn Nextudy in four steps — attach, ask, switch hubs and export." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STEPS = [
  {
    icon: Upload,
    title: "1. Attach your material",
    body: "Tap the + button in the chat and pick a PDF or a photo of your notes. The text is read on your device and used straight away in the conversation — the file itself is never stored.",
  },
  {
    icon: Sparkles,
    title: "2. Ask anything",
    body: "Ask for a summary, simpler explanation, or a set of practice questions. Follow-up questions keep the same material in mind.",
  },
  {
    icon: Mountain,
    title: "3. Switch hubs",
    body: "Mentor is your study partner for explanations and exam prep. Vanguard is your blunt business partner for venture plans and Launch Blueprints.",
  },
  {
    icon: FileDown,
    title: "4. Export what you need",
    body: "Use Export chat at the top of the conversation to download a clean PDF of everything you worked through.",
  },
];

function TutorialPage() {
  return (
    <AppLayout title="Tutorial">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-display font-bold">Getting started</h1>
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
            <Link to="/chat">Open the chat <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
