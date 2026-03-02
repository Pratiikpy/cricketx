import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { contractAddresses, MockUSDCABI, USDC_DECIMALS } from "@/config/contracts";

export function useFaucet() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  function mintTestUSDC(to: `0x${string}`, amountUsd: number = 100) {
    const amount = parseUnits(amountUsd.toString(), USDC_DECIMALS);
    writeContract({
      address: contractAddresses.usdc,
      abi: MockUSDCABI,
      functionName: "mint",
      args: [to, amount],
    });
  }

  return {
    mintTestUSDC,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    txHash: hash,
    reset,
  };
}
