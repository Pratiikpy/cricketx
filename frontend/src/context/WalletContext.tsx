import { createContext, useContext, useState, ReactNode } from "react";
import { useAccount, useConnect, useDisconnect, useReadContract, type Connector } from "wagmi";
import { formatUnits } from "viem";
import { contractAddresses, USDC_DECIMALS, ERC20ABI } from "@/config/contracts";

interface WalletState {
  connected: boolean;
  address: string;
  balance: number;
  connect: () => void;
  disconnect: () => void;
  rawAddress: `0x${string}` | undefined;
  showConnectorModal: boolean;
  connectors: readonly Connector[];
  connectWith: (connector: Connector) => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected } = useAccount();
  const { connect: wagmiConnect, connectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const [showConnectorModal, setShowConnectorModal] = useState(false);

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contractAddresses.usdc,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const balanceUsd = usdcBalance
    ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS))
    : 0;

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  // Show modal with connector choices
  const connect = () => setShowConnectorModal(true);
  const closeModal = () => setShowConnectorModal(false);

  const connectWith = (connector: Connector) => {
    wagmiConnect({ connector });
    setShowConnectorModal(false);
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
        showConnectorModal,
        connectors,
        connectWith,
        closeModal,
      }}
    >
      {children}
      {/* Connector selection modal */}
      {showConnectorModal && !isConnected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <h3 className="font-bold text-lg">Connect Wallet</h3>
            <p className="text-sm text-muted-foreground">Choose how you want to connect:</p>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connectWith(connector)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                >
                  {connector.icon && (
                    <img src={connector.icon} alt="" className="w-8 h-8 rounded-lg" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">{connector.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {connector.name.includes("MetaMask") && "Browser extension"}
                      {connector.name.includes("Coinbase") && "Smart Wallet or extension"}
                      {connector.name.includes("Injected") && "Browser wallet"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={closeModal}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
