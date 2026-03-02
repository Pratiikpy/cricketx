import { http, createConfig } from "wagmi";
import { baseSepolia, base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

// Use Base Sepolia for development, Base Mainnet for production
const isProduction = import.meta.env.VITE_NETWORK === "mainnet";
const chain = isProduction ? base : baseSepolia;

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    coinbaseWallet({
      appName: "CricketX",
      preference: "smartWalletOnly",
    }),
    injected(),
  ],
  transports: {
    [chain.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
