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
  const [guest, setG] = useState<boolean>(() => isGuest());
  useEffect(() => {
    const update = () => setG(isGuest());
    window.addEventListener("storage", update);
    window.addEventListener("nextudy-guest-change", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("nextudy-guest-change", update);
    };
  }, []);
  return guest;
}
