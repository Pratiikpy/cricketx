import { CricketXMarketABI, CricketXMarketFactoryABI, MockUSDCABI } from "./abis";

// Contract addresses — update after deployment
// These will be loaded from deployment JSON or env vars
const CONTRACTS = {
  baseSepolia: {
    factory: (import.meta.env.VITE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    usdc: (import.meta.env.VITE_USDC_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  },
  baseMainnet: {
    factory: (import.meta.env.VITE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
  },
};

const isProduction = import.meta.env.VITE_NETWORK === "mainnet";
const network = isProduction ? "baseMainnet" : "baseSepolia";

export const contractAddresses = CONTRACTS[network];
export const USDC_DECIMALS = 6;

// Re-export ABIs
export { CricketXMarketABI, CricketXMarketFactoryABI, MockUSDCABI };

// ERC20 minimal ABI for USDC approve/balanceOf
export const ERC20ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
] as const;
