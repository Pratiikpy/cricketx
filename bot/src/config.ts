import "dotenv/config";
import * as path from "path";
import * as fs from "fs";

// Load deployment addresses from contracts output
function loadDeployment(): Record<string, string> {
  const network = process.env.NETWORK || "baseSepolia";
  const deployPath = path.join(__dirname, "..", "..", "contracts", "deployments", `${network}.json`);

  if (fs.existsSync(deployPath)) {
    const data = JSON.parse(fs.readFileSync(deployPath, "utf-8"));
    return data.contracts;
  }

  // Fallback to env vars
  return {
    oracle: process.env.ORACLE_ADDRESS || "",
    factory: process.env.FACTORY_ADDRESS || "",
    usdc: process.env.USDC_ADDRESS || "",
  };
}

const deployment = loadDeployment();

export const config = {
  // Network
  network: process.env.NETWORK || "baseSepolia",
  rpcUrl:
    process.env.NETWORK === "baseMainnet"
      ? process.env.BASE_MAINNET_RPC || "https://mainnet.base.org"
      : process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",

  // Bot wallet
  botPrivateKey: process.env.BOT_PRIVATE_KEY || "",

  // Contract addresses
  oracleAddress: process.env.ORACLE_ADDRESS || deployment.oracle,
  factoryAddress: process.env.FACTORY_ADDRESS || deployment.factory,
  usdcAddress: process.env.USDC_ADDRESS || deployment.usdc,

  // CricAPI
  cricapiKey: process.env.CRICAPI_KEY || "",
  cricapiBase: "https://api.cricapi.com/v1",

  // Neynar (Farcaster)
  neynarApiKey: process.env.NEYNAR_API_KEY || "",
  neynarSignerUuid: process.env.NEYNAR_SIGNER_UUID || "",

  // App URL
  appUrl: process.env.APP_URL || "https://cricketx.xyz",

  // Paths
  settledMarketsPath: path.join(__dirname, "..", "data", "settled-markets.json"),
};
