import * as fs from "fs";
import { config } from "./config";
import { getOracle, getUnsettledMarkets } from "./contracts";
import { getMatchResult, determineOutcome } from "./cricapi";
import { postTossResult, postMatchResult } from "./farcaster";

// --- Local settlement tracking ---

function loadSettledMarkets(): Set<string> {
  try {
    if (fs.existsSync(config.settledMarketsPath)) {
      const data = JSON.parse(fs.readFileSync(config.settledMarketsPath, "utf-8"));
      return new Set(data);
    }
  } catch {}
  return new Set();
}

function saveSettledMarkets(settled: Set<string>): void {
  const dir = require("path").dirname(config.settledMarketsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(config.settledMarketsPath, JSON.stringify([...settled], null, 2));
}

// --- Settlement logic ---

export async function settleTossMarkets(): Promise<void> {
  console.log("[Toss] Checking for unsettled toss markets...");
  const settled = loadSettledMarkets();

  const unsettled = await getUnsettledMarkets(1); // marketType 1 = TOSS_WINNER
  if (unsettled.length === 0) {
    console.log("[Toss] No unsettled toss markets");
    return;
  }

  const oracle = getOracle();

  for (const market of unsettled) {
    if (settled.has(market.address)) continue;

    try {
      const matchData = await getMatchResult(market.matchId);

      if (!matchData.tossWinner) {
        console.log(`[Toss] ${market.matchId}: No toss result yet`);
        continue;
      }

      const outcome = determineOutcome(matchData.tossWinner, market.teamA, market.teamB);
      console.log(`[Toss] ${market.matchId}: ${matchData.tossWinner} won toss → outcome ${outcome}`);

      const tx = await oracle.reportResult(market.address, outcome);
      await tx.wait();
      console.log(`[Toss] Settled ${market.address} (tx: ${tx.hash})`);

      settled.add(market.address);
      saveSettledMarkets(settled);

      // Post to Farcaster
      await postTossResult(
        market.teamA,
        market.teamB,
        matchData.tossWinner,
        matchData.tossChoice || "unknown"
      ).catch((err) => console.error("[Farcaster] Toss post failed:", err.message));

    } catch (err: any) {
      console.error(`[Toss] Error settling ${market.matchId}:`, err.message);
    }
  }
}

export async function settleMatchMarkets(): Promise<void> {
  console.log("[Match] Checking for unsettled match markets...");
  const settled = loadSettledMarkets();

  const unsettled = await getUnsettledMarkets(0); // marketType 0 = MATCH_WINNER
  if (unsettled.length === 0) {
    console.log("[Match] No unsettled match markets");
    return;
  }

  const oracle = getOracle();

  for (const market of unsettled) {
    if (settled.has(market.address)) continue;

    try {
      const matchData = await getMatchResult(market.matchId);

      if (!matchData.matchWinner) {
        console.log(`[Match] ${market.matchId}: No match result yet`);
        continue;
      }

      const outcome = determineOutcome(matchData.matchWinner, market.teamA, market.teamB);
      console.log(`[Match] ${market.matchId}: ${matchData.matchWinner} won → outcome ${outcome}`);

      // 2-minute settlement delay for data accuracy
      console.log(`[Match] Waiting 2 minutes before settlement...`);
      await new Promise((r) => setTimeout(r, 120_000));

      const tx = await oracle.reportResult(market.address, outcome);
      await tx.wait();
      console.log(`[Match] Settled ${market.address} (tx: ${tx.hash})`);

      settled.add(market.address);
      saveSettledMarkets(settled);

      // Post to Farcaster
      await postMatchResult(
        market.teamA,
        market.teamB,
        matchData.matchWinner,
        matchData.status || ""
      ).catch((err) => console.error("[Farcaster] Match post failed:", err.message));

    } catch (err: any) {
      console.error(`[Match] Error settling ${market.matchId}:`, err.message);
    }
  }
}
