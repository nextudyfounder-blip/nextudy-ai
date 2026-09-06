import type { RealmDirection } from "@/lib/realm";

/**
 * Cinematic realm camera move.
 *
 * "down" = Vanguard peak -> Mentor cavern: the camera plunges through stacked
 * rocky cavern rings into deep violet darkness, with fog banks rolling past.
 * "up"   = Mentor cavern -> Vanguard peak: the camera climbs out of the
 * underworld toward the emerald citadel silhouette.
 *
 * Only transform/opacity animate so the whole move stays on the GPU.
 * Mobile and reduced-motion users get a short fade (`fast`).
 */
const RINGS = [0, 1, 2, 3, 4, 5, 6, 7];
const FOG = [0, 1, 2, 3];
const SPARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

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
        {!fast && (
          <>
            {RINGS.map((i) => (
              <div
                key={`ring-${i}`}
                className="realm-cavern-ring"
                style={{ animationDelay: `${i * 95}ms`, ["--ring" as string]: String(i) }}
              />
            ))}
            {SPARKS.map((i) => (
              <div
                key={`spark-${i}`}
                className="realm-spark"
                style={{
                  ["--x" as string]: `${(i * 37) % 100}%`,
                  ["--d" as string]: `${(i % 5) * 90}ms`,
                  ["--s" as string]: String(0.5 + ((i % 4) * 0.35)),
                }}
              />
            ))}
            {/* Destination silhouette: cavern floor going down, citadel going up */}
            <div className="realm-landmark" />
          </>
        )}
      </div>

      {FOG.map((i) => (
        <div
          key={`fog-${i}`}
          className="realm-fog"
          style={{ animationDelay: `${i * 130}ms`, ["--f" as string]: String(i) }}
        />
      ))}
      <div className="realm-transit-vignette" />
      <div className="realm-transit-wash" />
    </div>
  );
}
