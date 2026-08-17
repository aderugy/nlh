import { HAND_GRID, type Hand, rangePercent } from "@/lib/ranges/hands";

interface RangeGridProps {
  weights: ReadonlyMap<Hand, number>;
  /** Ring this cell — used to show which hand was dealt. */
  highlight?: Hand | null;
  caption?: string;
}

/**
 * The 13x13 grid. Partial weights are drawn as a bottom-up fill, the way the
 * user's range editor draws them.
 *
 * Sized to stay readable at ~360 px wide: 13 columns of roughly 24 px.
 */
export function RangeGrid({ weights, highlight = null, caption }: RangeGridProps) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div
        className="grid w-full gap-px"
        style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
      >
        {HAND_GRID.map((row) =>
          row.map((hand) => {
            const weight = weights.get(hand) ?? 0;
            const percent = Math.round(weight * 100);
            const isHighlight = hand === highlight;

            return (
              <div
                key={hand}
                title={weight > 0 ? `${hand} ${percent}%` : hand}
                className={[
                  "relative flex aspect-square items-center justify-center overflow-hidden rounded-[2px] text-[6px] font-medium leading-none sm:text-[9px]",
                  weight > 0
                    ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800/60 dark:text-zinc-600",
                  isHighlight ? "z-10 outline-2 outline-amber-500" : "",
                ].join(" ")}
              >
                {weight > 0 && (
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-emerald-500/70 dark:bg-emerald-500/60"
                    style={{ top: `${100 - percent}%` }}
                  />
                )}
                <span className="relative">{hand}</span>
              </div>
            );
          }),
        )}
      </div>
      {caption && (
        <figcaption className="text-xs text-zinc-500 dark:text-zinc-400">
          {caption} · {rangePercent(weights).toFixed(1)}% of hands
        </figcaption>
      )}
    </figure>
  );
}
