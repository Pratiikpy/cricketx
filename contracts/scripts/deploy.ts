import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Network:", network.name);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const botAddress = process.env.BOT_ADDRESS || deployer.address;
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;

  // 1. Deploy USDC (testnet only) or use existing mainnet address
  let usdcAddress: string;
  if (network.name === "baseMainnet") {
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("Using Base Mainnet USDC:", usdcAddress);
  } else {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("MockUSDC deployed:", usdcAddress);
  }

  // 2. Deploy Oracle
  const Oracle = await ethers.getContractFactory("CricketXOracle");
  const oracle = await Oracle.deploy(botAddress);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("CricketXOracle deployed:", oracleAddress);

  // 3. Deploy Factory
  const Factory = await ethers.getContractFactory("CricketXMarketFactory");
  const factory = await Factory.deploy(oracleAddress, treasuryAddress, usdcAddress, botAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("CricketXMarketFactory deployed:", factoryAddress);

  // 4. Link oracle to factory
  const tx = await oracle.setFactory(factoryAddress);
  await tx.wait();
  console.log("Oracle linked to factory");

  // 5. Save deployment addresses
  const deployment = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    botAddress,
    treasuryAddress,
    contracts: {
      usdc: usdcAddress,
      oracle: oracleAddress,
      factory: factoryAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log(`\nDeployment saved to ${outFile}`);
  console.log(JSON.stringify(deployment.contracts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
