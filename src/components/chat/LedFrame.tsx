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

export function useLedSettings() {
  const [state, setState] = useState(() => readLedSettings());
  useEffect(() => {
    const sync = () => setState(readLedSettings());
    window.addEventListener("storage", sync);
    window.addEventListener(LED_STORAGE.event, sync);
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
}

export function LedFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { enabled, preset } = useLedSettings();
  const cls = enabled
    ? `led-frame led-${preset} ${LED_PRESETS.find(p => p.id === preset)?.animated ? "led-flow" : ""}`
    : "";
  return <div className={`${cls} ${className}`}>{children}</div>;
}
