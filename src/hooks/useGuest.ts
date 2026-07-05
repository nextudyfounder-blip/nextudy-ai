import { useEffect, useState } from "react";

const KEY = "nextudy-guest";

export function isGuest(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setGuest(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(KEY, "1");
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("nextudy-guest-change"));
}

export function useGuest() {
  const [guest, setState] = useState<boolean>(() => isGuest());
  useEffect(() => {
    const sync = () => setState(isGuest());
    window.addEventListener("nextudy-guest-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nextudy-guest-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return guest;
}
