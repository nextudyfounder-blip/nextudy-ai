import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Nextudy — Study less. Know more." },
      {
        name: "description",
        content:
          "Nextudy turns your PDFs and photos into instant AI summaries, answers and practice — one calm workspace for students.",
      },
      { property: "og:title", content: "Nextudy — Study less. Know more." },
      { property: "og:description", content: "Upload a PDF or photo, get an instant AI summary and learn faster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Footer />
    </main>
  );
}
