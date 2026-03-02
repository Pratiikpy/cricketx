import { useReadContract, useReadContracts } from "wagmi";
import { contractAddresses, CricketXMarketFactoryABI, CricketXMarketABI, ERC20ABI } from "@/config/contracts";

// Read all market addresses from factory
export function useMarketAddresses() {
  return useReadContract({
    address: contractAddresses.factory,
    abi: CricketXMarketFactoryABI,
    functionName: "getMarkets",
  });
}

// Read market info for a specific address
export function useMarketInfo(marketAddress: `0x${string}` | undefined) {
  return useReadContracts({
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
}

// Read USDC balance for an address
export function useUsdcBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: contractAddresses.usdc,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// Read order book from market contract
export function useOrderBook(marketAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: marketAddress,
    abi: CricketXMarketABI,
    functionName: "getOrderBook",
    query: { enabled: !!marketAddress },
  });
}

// Read user's orders from market
export function useUserOrders(
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

// Read user payout estimate
export function useUserPayout(
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
