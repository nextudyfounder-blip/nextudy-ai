import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  applyHolidayTheme, getActiveEvent, holidayThemeEnabled, setHolidayThemeEnabled,
  HOLIDAY_THEME_STORAGE,
} from "@/lib/holidays";

/**
 * Hands-free holiday engine bridge:
 * - keeps the holiday-* class on <html> in sync with the real calendar
 * - shows a single non-intrusive popup per event, per account, on login
 */
export function HolidayThemeWatcher() {
  const { user, loading } = useAuth();

  useEffect(() => {
    applyHolidayTheme();
    const sync = () => applyHolidayTheme();
    window.addEventListener(HOLIDAY_THEME_STORAGE.event, sync);
    // Re-evaluate hourly so windows open/close without a reload.
    const timer = window.setInterval(sync, 60 * 60 * 1000);
    return () => {
      window.removeEventListener(HOLIDAY_THEME_STORAGE.event, sync);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    const event = getActiveEvent();
    if (!event || !holidayThemeEnabled()) return;
    const key = `${HOLIDAY_THEME_STORAGE.seenPrefix}${user.id}-${event.id}`;
    if (localStorage.getItem(key) === "1") return;
    localStorage.setItem(key, "1");
    toast(`${event.emoji} ${event.badge} active`, {
      description: "Seasonal themes can be turned off anytime in Settings.",
      duration: 9000,
      action: {
        label: "Turn off",
        onClick: () => {
          setHolidayThemeEnabled(false);
          applyHolidayTheme();
        },
      },
    });
  }, [user, loading]);

  return null;
}
