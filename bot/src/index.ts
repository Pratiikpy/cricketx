import cron from "node-cron";
import { config } from "./config";
import { getFactory, botWallet, provider } from "./contracts";
import { searchIPLSeries, getTodaysMatches, getTeamShort } from "./cricapi";
import { settleTossMarkets, settleMatchMarkets } from "./settlements";
import { postMarketCreated } from "./farcaster";

// --- Cron Job 1: Create Daily Markets (8:00 AM IST = 2:30 UTC) ---

async function createDailyMarkets(): Promise<void> {
  console.log("\n[CreateMarkets] Starting daily market creation...");

  try {
    const seriesId = await searchIPLSeries();
    if (!seriesId) {
      console.log("[CreateMarkets] No IPL series found");
      return;
    }

    const todaysMatches = await getTodaysMatches(seriesId);
    if (todaysMatches.length === 0) {
      console.log("[CreateMarkets] No matches today");
      return;
    }

    const factory = getFactory();

    for (const match of todaysMatches) {
      if (!match.teams || match.teams.length < 2) continue;

      const matchId = match.id;
      const teamA = getTeamShort(match.teams[0]);
      const teamB = getTeamShort(match.teams[1]);

      // Check if markets already exist
      const existing = await factory.getMarketsByMatch(matchId);
      if (existing.length > 0) {
        console.log(`[CreateMarkets] Markets already exist for ${matchId} (${teamA} vs ${teamB})`);
        continue;
      }

      // Closing time = match start time
      const matchStart = Math.floor(new Date(match.dateTimeGMT).getTime() / 1000);

      // Create MATCH_WINNER market (type 0)
      const tx1 = await factory.createMarket(matchId, 0, teamA, teamB, matchStart);
      await tx1.wait();
      console.log(`[CreateMarkets] MATCH_WINNER market created for ${teamA} vs ${teamB}`);

      // Create TOSS_WINNER market (type 1)
      const tx2 = await factory.createMarket(matchId, 1, teamA, teamB, matchStart);
      await tx2.wait();
      console.log(`[CreateMarkets] TOSS_WINNER market created for ${teamA} vs ${teamB}`);

      // Post to Farcaster
      await postMarketCreated(teamA, teamB, matchId).catch((err) =>
        console.error("[Farcaster] Post failed:", err.message)
      );
    }

    console.log("[CreateMarkets] Done");
  } catch (err: any) {
    console.error("[CreateMarkets] Error:", err.message);
  }
}

// --- Startup ---

async function main(): Promise<void> {
  console.log("=== CricketX Bot Starting ===");
  console.log(`Network: ${config.network}`);
  console.log(`RPC: ${config.rpcUrl}`);

  if (!botWallet) {
    console.error("ERROR: BOT_PRIVATE_KEY not set. Exiting.");
    process.exit(1);
  }

  const balance = await provider.getBalance(botWallet.address);
  console.log(`Bot address: ${botWallet.address}`);
  console.log(`Bot balance: ${(Number(balance) / 1e18).toFixed(6)} ETH`);

  if (balance === 0n) {
    console.warn("WARNING: Bot has no ETH for gas!");
  }

  // Schedule cron jobs
  // Job 1: Create markets at 8:00 AM IST (2:30 UTC)
  cron.schedule("30 2 * * *", () => {
    createDailyMarkets().catch(console.error);
  });
  console.log("Cron scheduled: Create markets (8:00 AM IST / 2:30 UTC)");

  // Job 2: Settle toss every 2 minutes
  cron.schedule("*/2 * * * *", () => {
    settleTossMarkets().catch(console.error);
  });
  console.log("Cron scheduled: Settle toss (every 2 min)");

  // Job 3: Settle match every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    settleMatchMarkets().catch(console.error);
  });
  console.log("Cron scheduled: Settle match (every 5 min)");

  console.log("\n=== Bot running. Press Ctrl+C to stop ===\n");

  // Run initial check
  await createDailyMarkets();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
