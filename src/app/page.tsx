import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Poker trainer</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Preflop drills, heads-up, from your own ranges.
        </p>
      </header>

      <nav className="flex flex-col gap-3">
        <Link
          href="/equity"
          className="rounded-xl border border-zinc-200 px-4 py-4 dark:border-zinc-800"
        >
          <span className="block font-medium">Equity quiz</span>
          <span className="block text-sm text-zinc-500 dark:text-zinc-400">
            Pick two ranges, estimate your hand&apos;s equity.
          </span>
        </Link>

        <Link
          href="/ranges"
          className="rounded-xl border border-zinc-200 px-4 py-4 dark:border-zinc-800"
        >
          <span className="block font-medium">Range quiz</span>
          <span className="block text-sm text-zinc-500 dark:text-zinc-400">
            Pick a range, call each hand raise, freq or fold.
          </span>
        </Link>
      </nav>
    </main>
  );
}
