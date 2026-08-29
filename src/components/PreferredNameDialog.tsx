import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { checkPreferredName } from "@/lib/profanity";

const ASKED_PREFIX = "nextudy-name-asked-";

/** First-login modal: asks how the AI should address the user. */
export function PreferredNameDialog() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const key = `${ASKED_PREFIX}${user.id}`;
    if (localStorage.getItem(key) === "1") return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      const current = (data?.display_name ?? "").trim();
      const fallback = (user.email ?? "").split("@")[0];
      // Only ask when the name is still the auto-generated email handle.
      if (current && current.toLowerCase() !== fallback.toLowerCase()) {
        localStorage.setItem(key, "1");
        return;
      }
      setName(current || fallback);
      setOpen(true);
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  const save = async () => {
    if (!user) return;
    const verdict = checkPreferredName(name);
    if (verdict.blocked) {
      toast.error(verdict.reason ?? "Please choose another name");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save your name");
      return;
    }
    localStorage.setItem(`${ASKED_PREFIX}${user.id}`, "1");
    setOpen(false);
    toast.success(`Nice to meet you, ${name.trim()}!`);
  };

  const skip = () => {
    if (user) localStorage.setItem(`${ASKED_PREFIX}${user.id}`, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : skip())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>How would you like to be called by the AI?</DialogTitle>
          <DialogDescription>
            Nextudy will use this name in greetings and answers. You can change it later in Settings.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="e.g. Prince"
          maxLength={32}
          autoFocus
        />
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={skip}>Later</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save name"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
