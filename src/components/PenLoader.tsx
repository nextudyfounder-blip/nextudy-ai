import { PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  inline?: boolean;
}

const SIZE = {
  sm: { ring: 32, pen: 12, radius: 12, gap: "gap-2", text: "text-xs" },
  md: { ring: 56, pen: 18, radius: 22, gap: "gap-3", text: "text-sm" },
  lg: { ring: 96, pen: 26, radius: 40, gap: "gap-4", text: "text-base" },
};

/**
 * Academic spinning-pen loader: a stylized pen orbits inside a glowing
 * neon-purple ring, trailing a fading gradient arc.
 */
export function PenLoader({ label, size = "md", className, inline = false }: Props) {
  const s = SIZE[size];
  const containerCls = inline
    ? cn("inline-flex items-center", s.gap, className)
    : cn("flex flex-col items-center justify-center", s.gap, className);

  return (
    <div className={containerCls} role="status" aria-live="polite">
      <div
        className="relative pen-ring-glow rounded-full"
        style={{ width: s.ring, height: s.ring }}
      >
        {/* neon ring track */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: "oklch(0.65 0.22 295)",
            borderRightColor: "oklch(0.55 0.22 295 / 0.35)",
          }}
        />
        {/* fading trail arc */}
        <div
          className="absolute inset-0 rounded-full pen-orbit"
          style={{
            background: `conic-gradient(from 0deg,
              oklch(0.65 0.22 295 / 0.55) 0deg,
              oklch(0.65 0.22 295 / 0) 220deg,
              oklch(0.65 0.22 295 / 0) 360deg)`,
            WebkitMask: "radial-gradient(circle, transparent 55%, black 58%)",
            mask: "radial-gradient(circle, transparent 55%, black 58%)",
          }}
        />
        {/* orbiting pen */}
        <div className="absolute inset-0 pen-orbit">
          <div
            className="absolute left-1/2 -translate-x-1/2 grid place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-600 shadow-[0_0_12px_oklch(0.6_0.22_295/0.7)]"
            style={{
              top: 2,
              width: s.pen + 4,
              height: s.pen + 4,
            }}
          >
            <PenLine
              className="text-white -rotate-45"
              style={{ width: s.pen - 2, height: s.pen - 2 }}
            />
          </div>
        </div>
      </div>
      {label && (
        <span className={cn("pulse-soft text-muted-foreground font-medium tracking-wide", s.text)}>
          {label}
        </span>
      )}
    </div>
  );
}
