import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  inline?: boolean;
}

const SIZE = {
  sm: { box: 24, gap: "gap-2", text: "text-xs" },
  md: { box: 40, gap: "gap-3", text: "text-sm" },
  lg: { box: 64, gap: "gap-4", text: "text-base" },
};

/**
 * Rotating pencil circle loader — a pencil traces a circular track.
 * Pure CSS/SVG, no glow or neon: the app's single loading indicator.
 */
export function PenLoader({ label, size = "md", className, inline = false }: Props) {
  const s = SIZE[size];
  const containerCls = inline
    ? cn("inline-flex items-center", s.gap, className)
    : cn("flex flex-col items-center justify-center", s.gap, className);

  return (
    <div className={containerCls} role="status" aria-live="polite">
      <svg
        width={s.box}
        height={s.box}
        viewBox="0 0 48 48"
        className="pencil-loader"
        aria-hidden
      >
        {/* circular track */}
        <circle
          cx="24"
          cy="24"
          r="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-border"
        />
        {/* traced arc + pencil, rotating together */}
        <g className="pencil-loader-spin">
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="var(--realm-accent, currentColor)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="34 86"
          />
          {/* pencil body pointing along the track */}
          <g transform="translate(24 5) rotate(45)">
            <rect
              x="-1.9"
              y="-7"
              width="3.8"
              height="10"
              rx="0.8"
              fill="var(--realm-accent, currentColor)"
            />
            <path d="M-1.9 3 L1.9 3 L0 6.4 Z" fill="currentColor" className="text-foreground" />
          </g>
        </g>
      </svg>
      {label && (
        <span className={cn("text-muted-foreground font-medium tracking-wide", s.text)}>
          {label}
        </span>
      )}
    </div>
  );
}
