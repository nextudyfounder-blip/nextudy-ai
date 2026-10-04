import { ChevronDown, Gem, Mountain, Check } from "lucide-react";
import { useRealm, type Realm } from "@/lib/realm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: Array<{ id: Realm; label: string; icon: typeof Gem }> = [
  { id: "mentor", label: "Mentor (Academic)", icon: Gem },
  { id: "vanguard", label: "Vanguard (Business)", icon: Mountain },
];

/** Minimal Gemini-style dropdown for switching realms. */
export function RealmSwitcher({ compact = false }: { compact?: boolean }) {
  const { realm, transition, switchRealm } = useRealm();
  const current = OPTIONS.find((o) => o.id === realm)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={transition !== null} className="gap-1.5 rounded-xl">
          <current.icon className="h-4 w-4 text-realm" />
          {!compact && <span className="hidden sm:inline">{current.label}</span>}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-xl">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.id} onClick={() => switchRealm(o.id)}>
            <o.icon className="h-4 w-4 mr-2" />{o.label}
            {o.id === realm && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
