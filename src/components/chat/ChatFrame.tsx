import type { ReactNode } from "react";

/**
 * Chat container frame: a single 1px solid border in the active realm accent.
 * No LED, glow or animated light effects — the inside stays flat and solid.
 */
export function ChatFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`realm-border rounded-3xl ${className}`}>{children}</div>;
}
