// Guest mode has been disabled to prevent unauthenticated AI usage.
// These exports remain for backwards-compat with existing imports but are no-ops.

export function isGuest(): boolean {
  return false;
}

export function setGuest(_on: boolean) {
  if (typeof window === "undefined") return;
  // Clear any leftover legacy flag.
  window.localStorage.removeItem("nextudy-guest");
  window.dispatchEvent(new Event("nextudy-guest-change"));
}

export function useGuest() {
  return false;
}
