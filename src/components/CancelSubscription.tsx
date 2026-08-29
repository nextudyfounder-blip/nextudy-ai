import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CalendarX } from "lucide-react";
import { cancelMySubscription } from "@/lib/subscription.functions";

/**
 * Stops auto-renewal at the end of the paid period. Pro/Turbo features stay
 * active until then, after which the account falls back to free Basic.
 */
export function CancelSubscription({
  disabled, className = "",
}: { disabled?: boolean; className?: string }) {
  const cancelFn = useServerFn(cancelMySubscription);
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await cancelMySubscriptionSafe(cancelFn);
      if (!res.cancelled) {
        toast("No active paid subscription found on this account.");
        return;
      }
      const ends = res.endsAt ? new Date(res.endsAt).toLocaleDateString() : null;
      toast.success(
        ends
          ? `Cancelled. You keep full access until ${ends}, then you move to Basic.`
          : "Cancelled. You keep full access until the end of your paid period.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel subscription");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={disabled || busy} className={className}>
          <CalendarX className="h-4 w-4 mr-2" />
          {busy ? "Cancelling…" : "Cancel subscription / Abonnement stopzetten"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stop auto-renewal?</AlertDialogTitle>
          <AlertDialogDescription>
            Your plan stays fully active until the end of the current billing period.
            After that you won't be charged again and your account switches to the
            free Basic plan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my plan</AlertDialogCancel>
          <AlertDialogAction onClick={cancel}>Yes, cancel renewal</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type CancelFn = () => Promise<{ cancelled: boolean; endsAt: string | null }>;

async function cancelMySubscriptionSafe(fn: unknown) {
  return (fn as CancelFn)();
}
