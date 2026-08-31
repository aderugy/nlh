import { connection } from "next/server";

import { loadRangeEntries } from "@/lib/ranges/data";
import { isHeroGroup } from "@/lib/ranges/tree";

import { RangeQuiz } from "./RangeQuiz";

export const metadata = {
  title: "Range quiz",
};

export default async function RangesPage() {
  // See the equity page: read `ranges.json` per request, not at build time.
  await connection();
  // The range quiz grades against the user's own ranges — the only valid answer
  // keys (see CLAUDE.md). Opponent models are excluded from the picker.
  const ranges = loadRangeEntries().filter((entry) => isHeroGroup(entry.group));

  return <RangeQuiz ranges={ranges} />;
}
