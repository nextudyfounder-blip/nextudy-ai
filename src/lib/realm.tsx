import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { RealmTransition } from "@/components/RealmTransition";

export type Realm = "mentor" | "vanguard";

export const REALM_META: Record<Realm, {
  id: Realm;
  name: string;
  hub: string;
  place: string;
  blurb: string;
}> = {
  mentor: {
    id: "mentor",
    name: "Mentor Realm",
    hub: "Study Hub",
    place: "Lower Realm — Cavern Depth",
    blurb: "Deep violet quiet for focused study.",
  },
  vanguard: {
    id: "vanguard",
    name: "Vanguard Realm",
    hub: "Business Hub",
    place: "Upper Realm — High Peak",
    blurb: "Sleek teal clarity for building ventures.",
  },
};

const STORAGE_KEY = "nextudy-realm";

/** Descent/ascent length. Mobile + reduced-motion get the fast fallback. */
export const REALM_TRANSITION_MS = 1400;
export const REALM_TRANSITION_MS_FAST = 420;

export type RealmDirection = "down" | "up";

interface RealmContextValue {
  realm: Realm;
  /** Non-null while the cinematic camera move is playing. */
  transition: RealmDirection | null;
  switchRealm: (next: Realm) => void;
  toggleRealm: () => void;
}

const RealmContext = createContext<RealmContextValue>({
  realm: "mentor",
  transition: null,
  switchRealm: () => {},
  toggleRealm: () => {},
});

function readRealm(): Realm {
  if (typeof window === "undefined") return "mentor";
  return localStorage.getItem(STORAGE_KEY) === "vanguard" ? "vanguard" : "mentor";
}

/** Applies the realm class to <html> so every token/border follows the realm. */
export function applyRealmClass(realm: Realm) {
  const root = document.documentElement;
  root.classList.toggle("realm-mentor", realm === "mentor");
  root.classList.toggle("realm-vanguard", realm === "vanguard");
  root.dataset["realm"] = realm;
}

/** Prefers the fast fallback on small screens / low-power devices. */
export function useFastRealmMotion(): boolean {
  const [fast, setFast] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px), (prefers-reduced-motion: reduce)");
    const sync = () => setFast(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fast;
}

export function RealmProvider({ children }: { children: ReactNode }) {
  const [realm, setRealm] = useState<Realm>("mentor");
  const [transition, setTransition] = useState<RealmDirection | null>(null);
  const fast = useFastRealmMotion();
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const initial = readRealm();
    setRealm(initial);
    applyRealmClass(initial);
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); };
  }, []);

  const switchRealm = useCallback((next: Realm) => {
    setRealm((current) => {
      if (current === next) return current;
      const duration = fast ? REALM_TRANSITION_MS_FAST : REALM_TRANSITION_MS;
      // Vanguard (peak) -> Mentor (cavern) descends; the reverse ascends.
      setTransition(next === "mentor" ? "down" : "up");
      localStorage.setItem(STORAGE_KEY, next);
      // Swap the palette mid-move so the camera lands in the new realm.
      timers.current.push(
        window.setTimeout(() => applyRealmClass(next), Math.round(duration * 0.55)),
        window.setTimeout(() => setTransition(null), duration),
      );
      return next;
    });
  }, [fast]);

  const toggleRealm = useCallback(() => {
    switchRealm(readRealm() === "mentor" ? "vanguard" : "mentor");
  }, [switchRealm]);

  const value = useMemo(
    () => ({ realm, transition, switchRealm, toggleRealm }),
    [realm, transition, switchRealm, toggleRealm],
  );

  return (
    <RealmContext.Provider value={value}>
      {children}
      <RealmTransition direction={transition} fast={fast} />
    </RealmContext.Provider>
  );
}

export function useRealm() {
  return useContext(RealmContext);
}
