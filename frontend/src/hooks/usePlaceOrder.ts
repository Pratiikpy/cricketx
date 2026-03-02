import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CricketXMarketABI, ERC20ABI, contractAddresses, USDC_DECIMALS } from "@/config/contracts";

export function usePlaceOrder() {
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    writeContract: writePlaceOrder,
    data: orderHash,
    isPending: isPlacing,
    error: orderError,
    reset: resetOrder,
  } = useWriteContract();

  const { isLoading: isWaitingApprove } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isWaitingOrder, isSuccess } = useWaitForTransactionReceipt({ hash: orderHash });

  async function placeOrder(
    marketAddress: `0x${string}`,
    side: number,    // 1=YES, 2=NO
    price: number,   // 1-99 (integer, not decimal)
    amountUsdc: number // dollar amount (e.g. 5.00)
  ) {
    const amountRaw = parseUnits(amountUsdc.toString(), USDC_DECIMALS);

    // Step 1: Approve USDC spend
    writeApprove(
      {
        address: contractAddresses.usdc,
        abi: ERC20ABI,
        functionName: "approve",
        args: [marketAddress, amountRaw],
      },
      {
        onSuccess: () => {
          // Step 2: Place order after approve
          writePlaceOrder({
            address: marketAddress,
            abi: CricketXMarketABI,
            functionName: "placeOrder",
            args: [side, price, amountRaw],
          });
        },
      }
    );
  }

  function reset() {
    resetApprove();
    resetOrder();
  }

  return {
    placeOrder,
    isLoading: isApproving || isWaitingApprove || isPlacing || isWaitingOrder,
    isSuccess,
    error: approveError || orderError,
    txHash: orderHash,
    reset,
  };
}
