import { type Card, RANK_CHARS, SUIT_SYMBOLS, isRedSuit, rankOf, suitOf } from "@/lib/ranges/cards";

interface PlayingCardProps {
  card: Card;
  /** Compact variant for inline use. */
  small?: boolean;
}

export function PlayingCard({ card, small = false }: PlayingCardProps) {
  const rank = rankOf(card);
  const suit = suitOf(card);
  const red = isRedSuit(suit);

  return (
    <span
      className={[
        "inline-flex flex-col items-center justify-center rounded-lg border bg-white font-semibold tabular-nums shadow-sm",
        "border-zinc-300 dark:border-zinc-600 dark:bg-zinc-100",
        red ? "text-rose-600" : "text-zinc-900",
        small ? "h-9 w-7 text-sm" : "h-24 w-[4.25rem] text-3xl sm:h-28 sm:w-20 sm:text-4xl",
      ].join(" ")}
      aria-label={`${RANK_CHARS[rank]} of ${["clubs", "diamonds", "hearts", "spades"][suit]}`}
    >
      <span className="leading-none">{RANK_CHARS[rank]}</span>
      <span className={small ? "text-xs leading-none" : "text-2xl leading-none sm:text-3xl"}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </span>
  );
}
