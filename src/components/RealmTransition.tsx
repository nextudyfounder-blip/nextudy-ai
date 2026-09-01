import type { RealmDirection } from "@/lib/realm";

/**
 * Cinematic realm camera move.
 *
 * "down" = Vanguard peak -> Mentor cavern: the camera descends through stacked
 * rocky cavern rings into deep violet darkness.
 * "up"   = Mentor cavern -> Vanguard peak: the camera rises back out into the
 * sleek dark teal upper realm.
 *
 * Only transform/opacity are animated so the whole move stays on the GPU.
 * Mobile and reduced-motion users get a short fade (`fast`).
 */
const RINGS = [0, 1, 2, 3, 4, 5];

export function RealmTransition({
  direction,
  fast,
}: {
  direction: RealmDirection | null;
  fast: boolean;
}) {
  if (!direction) return null;

  return (
    <div
      className={`realm-transit realm-transit-${direction} ${fast ? "realm-transit-fast" : ""}`}
      aria-hidden
    >
      <div className="realm-transit-stage">
        {!fast &&
          RINGS.map((i) => (
            <div
              key={i}
              className="realm-cavern-ring"
              style={{ animationDelay: `${i * 110}ms`, ["--ring" as string]: String(i) }}
            />
          ))}
      </div>
      <div className="realm-transit-vignette" />
      <div className="realm-transit-wash" />
    </div>
  );
}
