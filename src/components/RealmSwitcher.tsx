import { Mountain, Gem } from "lucide-react";
import { REALM_META, useRealm } from "@/lib/realm";
import { Button } from "@/components/ui/button";

/** Header control that travels between the Vanguard peak and the Mentor cavern. */
export function RealmSwitcher({ compact = false }: { compact?: boolean }) {
  const { realm, transition, toggleRealm } = useRealm();
  const target = realm === "mentor" ? REALM_META.vanguard : REALM_META.mentor;
  const Icon = realm === "mentor" ? Mountain : Gem;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleRealm}
      disabled={transition !== null}
      className="realm-border gap-1.5 bg-transparent"
      title={`Travel to the ${target.name} (${target.hub})`}
    >
      <Icon className="h-4 w-4 text-[color:var(--realm-accent)]" />
      {!compact && (
        <span className="hidden sm:inline">
          {realm === "mentor" ? "Ascend to Vanguard" : "Descend to Mentor"}
        </span>
      )}
    </Button>
  );
}
