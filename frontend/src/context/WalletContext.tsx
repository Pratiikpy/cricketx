import { createContext, useContext, ReactNode } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { contractAddresses, USDC_DECIMALS, ERC20ABI } from "@/config/contracts";
import { useReadContract } from "wagmi";

interface WalletState {
  connected: boolean;
  address: string;
  balance: number; // USDC balance in dollars
  connect: () => void;
  disconnect: () => void;
  rawAddress: `0x${string}` | undefined;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected } = useAccount();
  const { connect: wagmiConnect, connectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contractAddresses.usdc,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const balanceUsd = usdcBalance
    ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS))
    : 0;

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const connect = () => {
    // Prefer Coinbase Wallet, fallback to first available connector
    const coinbase = connectors.find((c) => c.name.toLowerCase().includes("coinbase"));
    const connector = coinbase || connectors[0];
    if (connector) wagmiConnect({ connector });
  };

  const disconnect = () => wagmiDisconnect();

  return (
    <WalletContext.Provider
      value={{
        connected: isConnected,
        address: truncatedAddress,
        balance: balanceUsd,
        connect,
        disconnect,
        rawAddress: address,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
