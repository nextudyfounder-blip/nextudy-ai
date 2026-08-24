import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const LED_PRESETS = [
  { id: "rainbow-wave",   label: "Rainbow Wave",    animated: true  },
  { id: "cyberpunk",      label: "Cyberpunk Shift", animated: true  },
  { id: "aura",           label: "Aura Pulse",      animated: true  },
  { id: "sunset",         label: "Slow Sunset",     animated: true  },
  { id: "ocean",          label: "Ocean Flow",      animated: true  },
  { id: "nebula",         label: "Nebula Drift",    animated: true  },
  { id: "forest",         label: "Forest Mist",     animated: true  },
  { id: "fire",           label: "Fire Ember",      animated: true  },
  { id: "cyan",           label: "Pure Cyan",       animated: false },
  { id: "crimson",        label: "Crimson",         animated: false },
  { id: "amber",          label: "Amber Glow",      animated: false },
  { id: "emerald",        label: "Emerald",         animated: false },
  { id: "magenta",        label: "Magenta",         animated: false },
  { id: "sky",            label: "Sky Blue",        animated: false },
  { id: "gold",           label: "Royal Gold",      animated: false },
  { id: "violet",         label: "Deep Violet",     animated: false },
  { id: "mint",           label: "Mint Ice",        animated: false },
] as const;

export type LedPresetId = typeof LED_PRESETS[number]["id"];

export const LED_STORAGE = {
  enabled: "nextudy-led-on",
  preset: "nextudy-led-preset",
  event: "nextudy-led-change",
};

export function readLedSettings() {
  if (typeof window === "undefined") return { enabled: true, preset: "rainbow-wave" as LedPresetId };
  return {
    enabled: localStorage.getItem(LED_STORAGE.enabled) !== "false",
    preset: (localStorage.getItem(LED_STORAGE.preset) || "rainbow-wave") as LedPresetId,
  };
}

/** Reads the signed-in user's saved LED preferences and mirrors them locally. */
export async function syncLedSettingsFromProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("profiles")
    .select("led_enabled, led_preset")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return;
  localStorage.setItem(LED_STORAGE.enabled, String(data.led_enabled));
  if (data.led_preset) localStorage.setItem(LED_STORAGE.preset, data.led_preset);
  window.dispatchEvent(new Event(LED_STORAGE.event));
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function useLedSettings() {
  const [state, setState] = useState(() => readLedSettings());
  useEffect(() => {
    const sync = () => setState(readLedSettings());
    window.addEventListener("storage", sync);
    window.addEventListener(LED_STORAGE.event, sync);
    void syncLedSettingsFromProfile();
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(LED_STORAGE.event, sync);
    };
  }, []);
  return state;
}

export function setLedSettings(next: Partial<{ enabled: boolean; preset: LedPresetId }>) {
  if (typeof next.enabled === "boolean") localStorage.setItem(LED_STORAGE.enabled, String(next.enabled));
  if (next.preset) localStorage.setItem(LED_STORAGE.preset, next.preset);
  window.dispatchEvent(new Event(LED_STORAGE.event));
  // Persist to the user's profile so preferences follow them across devices
  void (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const patch: { led_enabled?: boolean; led_preset?: string } = {};
    if (typeof next.enabled === "boolean") patch.led_enabled = next.enabled;
    if (next.preset) patch.led_preset = next.preset;
    if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("id", user.id);
  })();
}

export function LedFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { enabled, preset } = useLedSettings();
  const reduced = usePrefersReducedMotion();
  const animated = LED_PRESETS.find((p) => p.id === preset)?.animated && !reduced;
  const cls = enabled
    ? `led-frame led-${preset} ${animated ? "led-flow" : ""} ${reduced ? "led-reduced" : ""}`
    : "";
  return <div className={`${cls} ${className}`}>{children}</div>;
}
