import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const CHANGELOG = [
  { title: "Gemini-style workspace", body: "A cleaner sidebar, realm switcher in the top bar and a focused chat canvas." },
  { title: "Plans & Billing", body: "See your plan, daily usage, referral credit and seasonal promo codes in one place." },
  { title: "Realm quotes", body: "Fresh historical quotes for Mentor and Vanguard every new chat." },
  { title: "Calendar & Deadlines", body: "Track deadlines with countdowns next to study seasons." },
];

type P = { open: boolean; onOpenChange: (v: boolean) => void };

export function WhatsNewDrawer({ open, onOpenChange }: P) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>What's New</SheetTitle>
          <SheetDescription>Latest Nextudy updates.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {CHANGELOG.map((c) => (
            <div key={c.title} className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium">{c.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FeedbackDrawer({ open, onOpenChange }: P) {
  const [text, setText] = useState("");
  const send = () => {
    window.location.href = `mailto:feedback@nextudy.app?subject=${encodeURIComponent("Nextudy feedback")}&body=${encodeURIComponent(text)}`;
    setText("");
    onOpenChange(false);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Feedback</SheetTitle>
          <SheetDescription>Tell us what to improve.</SheetDescription>
        </SheetHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="mt-6 rounded-xl" placeholder="Your idea or issue…" />
        <Button className="mt-3 w-full" disabled={!text.trim()} onClick={send}>Send feedback</Button>
      </SheetContent>
    </Sheet>
  );
}
