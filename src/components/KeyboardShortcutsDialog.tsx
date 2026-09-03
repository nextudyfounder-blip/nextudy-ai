import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/** True on touch-first / small devices, where physical shortcuts don't apply. */
export function useIsTouchDevice(): boolean {
  const [touch, setTouch] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 767px)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return touch;
}

const SHORTCUTS = [
  { keys: ["Cmd/Ctrl", "K"], label: "Switch hubs (Mentor ↔ Vanguard)" },
  { keys: ["Cmd/Ctrl", "Enter"], label: "Send message" },
];

export function KeyboardShortcutsDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md realm-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Keyboard className="h-5 w-5 text-realm" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>Move faster between the realms and your conversations.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-4 py-2.5 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="flex gap-1 shrink-0">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-mono"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
