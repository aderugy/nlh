import { connection } from "next/server";

import { loadRangeEntries } from "@/lib/ranges/data";

import { EquityQuiz } from "./EquityQuiz";

export const metadata = {
  title: "Equity quiz",
};

export default async function EquityPage() {
  // `ranges.json` is read synchronously from disk. Waiting for a request keeps
  // it out of the prerender, so a fresh export is picked up on server restart
  // rather than baked into the build.
  await connection();
  const ranges = loadRangeEntries();

  return <EquityQuiz ranges={ranges} />;
}
