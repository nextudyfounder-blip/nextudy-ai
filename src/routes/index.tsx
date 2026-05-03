import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Nextudy — Study less. Know more." },
      {
        name: "description",
        content:
          "AI-powered study companion: PDF summaries, flashcards, mindmaps and practice questions for students. Free plan available.",
      },
      { property: "og:title", content: "Nextudy — Study less. Know more." },
      { property: "og:description", content: "Turn PDFs into summaries, flashcards and mindmaps with AI." },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
