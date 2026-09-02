import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  applyHolidayTheme, getActiveEvent, holidayThemeEnabled, setHolidayThemeEnabled,
  HOLIDAY_THEME_STORAGE, type HolidayEvent,
} from "@/lib/holidays";

/** Live active-event state that follows the real calendar and the user toggle. */
export function useActiveSeason(): HolidayEvent | null {
  const [event, setEvent] = useState<HolidayEvent | null>(null);
  useEffect(() => {
    const sync = () => setEvent(holidayThemeEnabled() ? getActiveEvent() : null);
    sync();
    window.addEventListener(HOLIDAY_THEME_STORAGE.event, sync);
    const timer = window.setInterval(sync, 60 * 60 * 1000);
    return () => {
      window.removeEventListener(HOLIDAY_THEME_STORAGE.event, sync);
      window.clearInterval(timer);
    };
  }, []);
  return event;
}

export function disableSeasonalThemes() {
  setHolidayThemeEnabled(false);
  applyHolidayTheme();
}

/** Compact header badge — flat, no glow or neon. */
export function SeasonBadge({ className = "" }: { className?: string }) {
  const event = useActiveSeason();
  if (!event) return null;
  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent ${className}`}
      title={`${event.label} theme is active — turn it off in Settings`}
    >
      <span aria-hidden>{event.emoji}</span>
      {event.badge}
    </span>
  );
}

/** Landing hero banner for the active event. Dismissable per device. */
export function SeasonBanner() {
  const event = useActiveSeason();
  const [hidden, setHidden] = useState(false);
  if (!event || hidden) return null;
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-accent/35 bg-accent/8 px-5 py-4 text-left flex items-start gap-3">
      <div className="h-9 w-9 shrink-0 rounded-xl border border-accent/40 bg-background grid place-items-center text-base" aria-hidden>
        {event.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">{event.badge}</span>
        </div>
        <div className="font-display font-semibold mt-1">{event.bannerTitle}</div>
        <p className="text-sm text-muted-foreground mt-0.5">{event.bannerSub}</p>
      </div>
      <button
        onClick={() => setHidden(true)}
        className="p-1 rounded hover:bg-background/60 text-muted-foreground shrink-0"
        title="Hide banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
