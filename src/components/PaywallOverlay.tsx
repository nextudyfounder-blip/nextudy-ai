import { Sparkles, Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  message?: string;
  checkoutUrl?: string | null;
  onDismiss?: () => void;
}

/**
 * Full-surface paywall overlay for pending crew seats or gated workspaces.
 */
export function PaywallOverlay({
  title = "Your team is waiting for you!",
  message = "Activate your seat to unlock this Study Crew's shared knowledge base.",
  checkoutUrl,
}: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-background/70 backdrop-blur-xl animate-fade-in">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card/90 shadow-2xl p-8 text-center space-y-5 animate-scale-in">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center shadow-glow">
          <Lock className="h-6 w-6 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        {checkoutUrl ? (
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90 shadow-glow"
          >
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
              <Sparkles className="h-4 w-4" /> Activate my seat
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Waiting for the crew owner to send you a payment link.
          </p>
        )}
      </div>
    </div>
  );
}
