import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CricketXMarketABI } from "@/config/contracts";

export function useClaimWinnings() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  function claimAll(marketAddress: `0x${string}`) {
    writeContract({
      address: marketAddress,
      abi: CricketXMarketABI,
      functionName: "claimAll",
    });
  }

  function claimWinnings(marketAddress: `0x${string}`) {
    writeContract({
      address: marketAddress,
      abi: CricketXMarketABI,
      functionName: "claimWinnings",
    });
  }

  function refundUnmatched(marketAddress: `0x${string}`) {
    writeContract({
      address: marketAddress,
      abi: CricketXMarketABI,
      functionName: "refundUnmatched",
    });
  }

  return {
    claimAll,
    claimWinnings,
    refundUnmatched,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    txHash: hash,
    reset,
  };
}
