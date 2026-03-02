import { http, createConfig } from "wagmi";
import { baseSepolia, base } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";

// Use Base Sepolia for development, Base Mainnet for production
const isProduction = import.meta.env.VITE_NETWORK === "mainnet";

export const wagmiConfig = createConfig({
  chains: isProduction ? [base] : [baseSepolia],
  connectors: [
    injected(), // MetaMask, Rabby, etc.
    coinbaseWallet({
      appName: "CricketX",
      preference: "all", // supports both smart wallet and extension
    }),
    metaMask(),
  ],
  transports: isProduction
    ? { [base.id]: http() }
    : { [baseSepolia.id]: http("https://sepolia.base.org") },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
