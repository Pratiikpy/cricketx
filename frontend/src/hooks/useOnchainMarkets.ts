import { useReadContract, useReadContracts } from "wagmi";
import { contractAddresses, CricketXMarketFactoryABI, CricketXMarketABI } from "@/config/contracts";
import { formatUnits } from "viem";

// Represents an on-chain market with decoded info
export interface OnchainMarket {
  address: `0x${string}`;
  matchId: string;
  marketType: number; // 0=MATCH_WINNER, 1=TOSS_WINNER
  teamA: string;
  teamB: string;
  closingTime: number;
  isSettled: boolean;
  outcome: number;
  totalVolume: string; // formatted USDC
  matchedPairs: number;
  ordersCount: number;
}

// Fetch all market addresses from factory
export function useAllMarketAddresses() {
  return useReadContract({
    address: contractAddresses.factory,
    abi: CricketXMarketFactoryABI,
    functionName: "getMarkets",
  });
}

// Fetch markets for a specific CricAPI match ID
export function useMarketsByMatch(matchId: string | undefined) {
  return useReadContract({
    address: contractAddresses.factory,
    abi: CricketXMarketFactoryABI,
    functionName: "getMarketsByMatch",
    args: matchId ? [matchId] : undefined,
    query: { enabled: !!matchId },
  });
}

// Read full market info for a single address
export function useOnchainMarketInfo(marketAddress: `0x${string}` | undefined) {
  const result = useReadContracts({
    contracts: marketAddress
      ? [
          { address: marketAddress, abi: CricketXMarketABI, functionName: "matchId" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "marketType" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "teamA" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "teamB" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "closingTime" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "isSettled" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "outcome" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "getTotalVolume" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "getMatchedPairsCount" },
          { address: marketAddress, abi: CricketXMarketABI, functionName: "getOrdersCount" },
        ]
      : [],
    query: { enabled: !!marketAddress },
  });

  const data = result.data;
  if (!data || data.some((d) => d.status !== "success")) {
    return { ...result, market: undefined };
  }

  const market: OnchainMarket = {
    address: marketAddress!,
    matchId: data[0].result as string,
    marketType: Number(data[1].result),
    teamA: data[2].result as string,
    teamB: data[3].result as string,
    closingTime: Number(data[4].result),
    isSettled: data[5].result as boolean,
    outcome: Number(data[6].result),
    totalVolume: formatUnits(data[7].result as bigint, 6),
    matchedPairs: Number(data[8].result),
    ordersCount: Number(data[9].result),
  };

  return { ...result, market };
}

// Read order book from a market contract
export function useOnchainOrderBook(marketAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: marketAddress,
    abi: CricketXMarketABI,
    functionName: "getOrderBook",
    query: {
      enabled: !!marketAddress,
      refetchInterval: 10_000, // refresh every 10s
    },
  });
}

// Read user's orders from a specific market
export function useOnchainUserOrders(
  marketAddress: `0x${string}` | undefined,
  userAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: marketAddress,
    abi: CricketXMarketABI,
    functionName: "getUserOrders",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!marketAddress && !!userAddress },
  });
}

// Read user payout from a settled market
export function useOnchainUserPayout(
  marketAddress: `0x${string}` | undefined,
  userAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: marketAddress,
    abi: CricketXMarketABI,
    functionName: "getUserPayout",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!marketAddress && !!userAddress },
  });
}
