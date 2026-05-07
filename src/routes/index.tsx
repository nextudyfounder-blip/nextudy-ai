import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";
import { RevealOnScroll } from "@/components/RevealOnScroll";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Nextudy — Study less. Know more." },
      {
        name: "description",
        content:
          "AI-powered study companion: PDF & photo summaries, flashcards, mindmaps, AI chat and practice questions for students. Free plan available.",
      },
      { property: "og:title", content: "Nextudy — Study less. Know more." },
      { property: "og:description", content: "Turn PDFs and photos into summaries, flashcards and AI chat answers." },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <RevealOnScroll><HowItWorks /></RevealOnScroll>
      <RevealOnScroll><Features /></RevealOnScroll>
      <RevealOnScroll><Pricing /></RevealOnScroll>
      <Footer />
    </main>
  );
}
