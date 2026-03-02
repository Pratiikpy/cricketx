import { ethers } from "ethers";
import { config } from "./config";

// Minimal ABIs — only the functions the bot needs
const ORACLE_ABI = [
  "function reportResult(address marketAddress, uint8 outcome) external",
  "function authorizedBot() view returns (address)",
  "event ResultReported(address indexed market, uint8 outcome, uint256 timestamp)",
];

const FACTORY_ABI = [
  "function createMarket(string matchId, uint8 marketType, string teamA, string teamB, uint256 closingTime) external returns (address)",
  "function getMarkets() view returns (address[])",
  "function getMarketsByMatch(string matchId) view returns (address[])",
  "function getMarketsCount() view returns (uint256)",
  "event MarketCreated(address indexed market, string matchId, uint8 marketType, string teamA, string teamB, uint256 closingTime)",
];

const MARKET_ABI = [
  "function matchId() view returns (string)",
  "function marketType() view returns (uint8)",
  "function teamA() view returns (string)",
  "function teamB() view returns (string)",
  "function closingTime() view returns (uint256)",
  "function isSettled() view returns (bool)",
  "function outcome() view returns (uint8)",
  "function getTotalVolume() view returns (uint256)",
  "function getMatchedPairsCount() view returns (uint256)",
];

// Provider + wallet
export const provider = new ethers.JsonRpcProvider(config.rpcUrl);
export const botWallet = config.botPrivateKey
  ? new ethers.Wallet(config.botPrivateKey, provider)
  : null;

// Contract instances
export function getOracle() {
  if (!botWallet) throw new Error("Bot wallet not configured");
  return new ethers.Contract(config.oracleAddress, ORACLE_ABI, botWallet);
}

export function getFactory() {
  if (!botWallet) throw new Error("Bot wallet not configured");
  return new ethers.Contract(config.factoryAddress, FACTORY_ABI, botWallet);
}

export function getMarket(address: string) {
  return new ethers.Contract(address, MARKET_ABI, provider);
}

// Convenience: get all unsettled markets of a specific type
export async function getUnsettledMarkets(marketType: number): Promise<
  Array<{ address: string; matchId: string; teamA: string; teamB: string }>
> {
  const factory = getFactory();
  const allMarkets: string[] = await factory.getMarkets();
  const results: Array<{ address: string; matchId: string; teamA: string; teamB: string }> = [];

  for (const addr of allMarkets) {
    const market = getMarket(addr);
    const [settled, mType, matchId, teamA, teamB] = await Promise.all([
      market.isSettled(),
      market.marketType(),
      market.matchId(),
      market.teamA(),
      market.teamB(),
    ]);

    if (!settled && Number(mType) === marketType) {
      results.push({ address: addr, matchId, teamA, teamB });
    }
  }

  return results;
}
