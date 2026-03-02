import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CricketXMarketABI } from "@/config/contracts";

export function useCancelOrder() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  function cancelOrder(marketAddress: `0x${string}`, orderId: bigint) {
    writeContract({
      address: marketAddress,
      abi: CricketXMarketABI,
      functionName: "cancelOrder",
      args: [orderId],
    });
  }

  return {
    cancelOrder,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    txHash: hash,
    reset,
  };
}
