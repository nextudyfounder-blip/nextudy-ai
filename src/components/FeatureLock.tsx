import { Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Props {
  locked: boolean;
  label?: string;
  className?: string;
  children: React.ReactNode;
  /** When true, blur & disable pointer events on children */
  blur?: boolean;
}

/**
 * Wrap any UI to gate it behind a paid tier. If `locked`, renders an inline
 * lock badge and (optionally) blurs the child content. Clicking the overlay
 * sends the user to pricing.
 */
export function FeatureLock({ locked, label = "Pro", className, blur = true, children }: Props) {
  if (!locked) return <>{children}</>;
  return (
    <div className={cn("relative group", className)}>
      <div className={cn(blur && "pointer-events-none select-none opacity-60 blur-[1.5px]")}>{children}</div>
      <Link
        to="/"
        hash="pricing"
        className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition"
        title={`Unlock ${label}`}
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-accent text-white text-[11px] font-semibold shadow-glow">
          <Sparkles className="h-3 w-3" /> Unlock {label}
        </span>
      </Link>
      <span className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-background/80 border border-border shadow-sm">
        <Lock className="h-3 w-3 text-muted-foreground" />
      </span>
    </div>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return <Lock className={cn("h-3 w-3 text-muted-foreground inline-block ml-1", className)} />;
}
