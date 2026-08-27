import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasProLed, type PlanId } from "@/lib/plans";

export type LedTier = "basic" | "pro";

export interface LedPreset {
  id: string;
  label: string;
  tier: LedTier;
  /** Basic = single hue with a flowing/static motion choice. Pro = multi-colour effect. */
  kind: "solid" | "dynamic";
  /** Preview swatch (CSS background). */
  swatch: string;
}

/** 8 basic hues — each supports "Flowing" (vloeibaar) and "Static" (stilstaand). */
export const BASIC_PRESETS: LedPreset[] = [
  { id: "green",  label: "Green",  tier: "basic", kind: "solid", swatch: "#22c55e" },
  { id: "yellow", label: "Yellow", tier: "basic", kind: "solid", swatch: "#facc15" },
  { id: "blue",   label: "Blue",   tier: "basic", kind: "solid", swatch: "#3b82f6" },
  { id: "red",    label: "Red",    tier: "basic", kind: "solid", swatch: "#ef4444" },
  { id: "cyan",   label: "Cyan",   tier: "basic", kind: "solid", swatch: "#06b6d4" },
  { id: "pink",   label: "Pink",   tier: "basic", kind: "solid", swatch: "#ec4899" },
  { id: "orange", label: "Orange", tier: "basic", kind: "solid", swatch: "#f97316" },
  { id: "purple", label: "Purple", tier: "basic", kind: "solid", swatch: "#a855f7" },
];

/** Pro & Turbo only — rainbow neon, RGB gradients and multi-colour flows. */
export const PRO_PRESETS: LedPreset[] = [
  { id: "rainbow-wave", label: "Rainbow Neon", tier: "pro", kind: "dynamic", swatch: "linear-gradient(90deg,#ff005c,#ffe600,#00ff88,#00d4ff,#7a00ff)" },
  { id: "cyberpunk",    label: "Cyberpunk RGB", tier: "pro", kind: "dynamic", swatch: "linear-gradient(90deg,#ff00ea,#00fff0,#7a00ff)" },
  { id: "aura",         label: "Aura Pulse",   tier: "pro", kind: "dynamic", swatch: "linear-gradient(90deg,#7a00ff,#e0aaff)" },
  { id: "sunset",       label: "Slow Sunset",  tier: "pro", kind: "dynamic", swatch: "linear-gradient(90deg,#ff5e00,#ff2d55,#ffb347)" },
  { id: "ocean",        label: "Ocean Flow",   tier: "pro", kind: "dynamic", swatch: "linear-gradient(90deg,#0077b6,#48cae4,#90e0ef)" },
  { id: "nebula",       label: "Nebula Drift", tier: "pro", kind: "dynamic", swatch: "linear-gradient(90deg,#240046,#7b2cbf,#c77dff)" },
  { id: "forest",       label: "Forest Mist",  tier: "pro", kind: "dynamic", swatch: "linear-gradient(90deg,#2d6a4f,#74c69d,#b7e4c7)" },
  { id: "fire",         label: "Fire Ember",   tier: "pro", kind: "dynamic", swatch: "linear-gradient(90deg,#ff3d00,#ffab00,#ffea00)" },
];

export const LED_PRESETS: LedPreset[] = [...BASIC_PRESETS, ...PRO_PRESETS];

export type LedPresetId = string;
export type LedMotion = "flow" | "static";

export function presetsForPlan(plan: PlanId): LedPreset[] {
  return hasProLed(plan) ? LED_PRESETS : BASIC_PRESETS;
}

export function isPresetAllowed(presetId: string, plan: PlanId): boolean {
  const preset = LED_PRESETS.find((p) => p.id === presetId);
  if (!preset) return false;
  return preset.tier === "basic" || hasProLed(plan);
}

export const LED_STORAGE = {
  enabled: "nextudy-led-on",
  preset: "nextudy-led-preset",
  motion: "nextudy-led-motion",
  underglow: "nextudy-led-underglow",
  event: "nextudy-led-change",
};

export interface LedSettings {
  enabled: boolean;
  preset: LedPresetId;
  motion: LedMotion;
  underglow: boolean;
}

const DEFAULTS: LedSettings = { enabled: true, preset: "blue", motion: "flow", underglow: true };

export function readLedSettings(): LedSettings {
  if (typeof window === "undefined") return DEFAULTS;
  return {
    enabled: localStorage.getItem(LED_STORAGE.enabled) !== "false",
    preset: localStorage.getItem(LED_STORAGE.preset) || DEFAULTS.preset,
    motion: (localStorage.getItem(LED_STORAGE.motion) as LedMotion) || DEFAULTS.motion,
    underglow: localStorage.getItem(LED_STORAGE.underglow) !== "false",
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
  if (data.led_preset) {
    // Stored as "<presetId>:<motion>" so a single column carries both.
    const [preset, motion] = String(data.led_preset).split(":");
    if (LED_PRESETS.some((p) => p.id === preset)) {
      localStorage.setItem(LED_STORAGE.preset, preset);
      if (motion === "flow" || motion === "static") localStorage.setItem(LED_STORAGE.motion, motion);
    }
  }
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

export function useLedSettings(): LedSettings {
  const [state, setState] = useState<LedSettings>(() => DEFAULTS);
  useEffect(() => {
    const sync = () => setState(readLedSettings());
    sync();
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

export function setLedSettings(next: Partial<LedSettings>) {
  if (typeof next.enabled === "boolean") localStorage.setItem(LED_STORAGE.enabled, String(next.enabled));
  if (typeof next.underglow === "boolean") localStorage.setItem(LED_STORAGE.underglow, String(next.underglow));
  if (next.preset) localStorage.setItem(LED_STORAGE.preset, next.preset);
  if (next.motion) localStorage.setItem(LED_STORAGE.motion, next.motion);
  window.dispatchEvent(new Event(LED_STORAGE.event));
  // Persist to the user's profile so preferences follow them across devices
  void (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = readLedSettings();
    const patch: { led_enabled?: boolean; led_preset?: string } = {};
    if (typeof next.enabled === "boolean") patch.led_enabled = next.enabled;
    if (next.preset || next.motion) patch.led_preset = `${current.preset}:${current.motion}`;
    if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("id", user.id);
  })();
}

/** CSS class carrying the text underglow colour of the active preset. */
export function useUnderglowClass() {
  const { enabled, preset, underglow } = useLedSettings();
  return underglow && enabled ? `ai-underglow led-glow-${preset}` : "";
}

export function LedFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { enabled, preset, motion } = useLedSettings();
  const reduced = usePrefersReducedMotion();
  const flowing = motion === "flow" && !reduced;
  const cls = enabled
    ? `led-frame led-${preset} ${flowing ? "led-flow" : ""} ${reduced ? "led-reduced" : ""}`
    : "";
  return <div className={`${cls} ${className}`}>{children}</div>;
}
