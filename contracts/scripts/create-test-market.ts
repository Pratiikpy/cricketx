import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Load deployment
  const deployFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deployFile)) {
    throw new Error(`No deployment found for ${network.name}. Run deploy.ts first.`);
  }
  const deployment = JSON.parse(fs.readFileSync(deployFile, "utf-8"));
  const factoryAddress = deployment.contracts.factory;

  const [signer] = await ethers.getSigners();
  console.log("Creating test market with:", signer.address);

  const factory = await ethers.getContractAt("CricketXMarketFactory", factoryAddress);

  const matchId = process.env.MATCH_ID || "test-match-" + Date.now();
  const marketType = parseInt(process.env.MARKET_TYPE || "0"); // 0=MATCH_WINNER, 1=TOSS_WINNER
  const teamA = process.env.TEAM_A || "CSK";
  const teamB = process.env.TEAM_B || "MI";
  const hoursFromNow = parseInt(process.env.HOURS || "2");

  const block = await ethers.provider.getBlock("latest");
  const closingTime = block!.timestamp + hoursFromNow * 3600;

  const tx = await factory.createMarket(matchId, marketType, teamA, teamB, closingTime);
  const receipt = await tx.wait();

  // Extract market address from event
  const event = receipt!.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog({ topics: log.topics as string[], data: log.data });
      return parsed?.name === "MarketCreated";
    } catch {
      return false;
    }
  });

  const parsed = factory.interface.parseLog({
    topics: event!.topics as string[],
    data: event!.data,
  });
  const marketAddress = parsed!.args[0];

  console.log("\nMarket created:");
  console.log("  Address:", marketAddress);
  console.log("  Match ID:", matchId);
  console.log("  Type:", marketType === 0 ? "MATCH_WINNER" : "TOSS_WINNER");
  console.log("  Teams:", teamA, "vs", teamB);
  console.log("  Closing:", new Date(closingTime * 1000).toISOString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
