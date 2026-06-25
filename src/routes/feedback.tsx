import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeft, MessageSquareHeart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/feedback")({
  component: FeedbackPage,
  head: () => ({ meta: [{ title: "Feedback — Nextudy" }, { name: "description", content: "Share ideas and suggestions to make Nextudy better." }] }),
});

function FeedbackPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const ADMIN_EMAIL = "nextudy.founder@gmail.com";

  const openMailto = (msg: string, from: string) => {
    const subject = encodeURIComponent("Nextudy feedback");
    const body = encodeURIComponent(`${msg}\n\n— from: ${from || "anonymous"}`);
    window.open(`mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`, "_blank");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      toast.error("Please write a longer message");
      return;
    }
    const msg = message.trim();
    const from = user?.email || email || "";
    if (!user) {
      // Anonymous submissions are no longer stored server-side.
      // Open the user's mail client so feedback still reaches the team.
      openMailto(msg, from);
      toast.message("Opened your email app", {
        description: "Sign in to send feedback directly from Nextudy.",
      });
      setSent(true);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        email: from || null,
        message: msg,
      });
      if (error) throw error;
      setSent(true);
      setMessage("");
      setEmail("");
      toast.success("Thanks! Your feedback was sent.");
      openMailto(msg, from);
    } catch (err) {
      openMailto(msg, from);
      toast.message("Opened your email app as a fallback", {
        description: err instanceof Error ? err.message : "Please send the email to deliver it.",
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
          <span className="h-8 w-8 rounded-xl overflow-hidden bg-gradient-accent shadow-glow flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            Nextudy
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Home</Link>
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow mb-4">
            <MessageSquareHeart className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">We'd love your feedback</h1>
          <p className="text-muted-foreground mt-2">Ideas, bugs, missing features — anything helps us make Nextudy better.</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
            <p className="text-lg font-medium">Got it 🙌</p>
            <p className="text-sm text-muted-foreground">We read every message. Want to send another one?</p>
            <Button variant="outline" onClick={() => setSent(false)}>Send another</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-8 space-y-5 shadow-elegant">
            {!user && (
              <div className="space-y-2">
                <Label htmlFor="email">Your email (optional)</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="message">Your message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would make Nextudy 10× better for you?"
                rows={6}
                maxLength={5000}
                required
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/5000</p>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send feedback"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
