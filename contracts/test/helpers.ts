import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

export async function deployFixture() {
  const [owner, bot, treasury, userA, userB, userC, randomUser] = await ethers.getSigners();

  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();

  // Deploy Oracle
  const Oracle = await ethers.getContractFactory("CricketXOracle");
  const oracle = await Oracle.deploy(bot.address);

  // Deploy Factory
  const Factory = await ethers.getContractFactory("CricketXMarketFactory");
  const factory = await Factory.deploy(
    await oracle.getAddress(),
    treasury.address,
    await usdc.getAddress(),
    bot.address
  );

  // Link oracle to factory
  await oracle.setFactory(await factory.getAddress());

  // Mint test USDC to users (100 USDC each = 100_000_000 units)
  const HUNDRED_USDC = 100_000_000n;
  await usdc.mint(userA.address, HUNDRED_USDC);
  await usdc.mint(userB.address, HUNDRED_USDC);
  await usdc.mint(userC.address, HUNDRED_USDC);

  return { owner, bot, treasury, userA, userB, userC, randomUser, usdc, oracle, factory };
}

export async function createTestMarket(
  factory: any,
  signer: any,
  matchId = "test-match-1",
  marketType = 0,
  teamA = "Team A",
  teamB = "Team B",
  closingTimeOffset = 3600
) {
  const closingTime = (await time.latest()) + closingTimeOffset;

  const tx = await factory.connect(signer).createMarket(
    matchId, marketType, teamA, teamB, closingTime
  );
  const receipt = await tx.wait();

  // Extract market address from MarketCreated event
  const event = receipt!.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog({ topics: log.topics as string[], data: log.data });
      return parsed?.name === "MarketCreated";
    } catch { return false; }
  });

  const parsed = factory.interface.parseLog({
    topics: event!.topics as string[],
    data: event!.data,
  });
  const marketAddr = parsed!.args[0];

  const market = await ethers.getContractAt("CricketXMarket", marketAddr);
  return { market, marketAddr, closingTime };
}

// Helper: approve USDC and place an order
export async function placeOrderHelper(
  market: any,
  usdc: any,
  user: any,
  side: number,
  price: number,
  amount: bigint
) {
  await usdc.connect(user).approve(await market.getAddress(), amount);
  return market.connect(user).placeOrder(side, price, amount);
}

// Constants matching contract
export const MIN_BET = 100_000n;      // $0.10
export const MAX_BET = 10_000_000n;   // $10.00
export const FEE_BPS = 200n;
export const BPS_DENOMINATOR = 10_000n;
export const ONE_USDC = 1_000_000n;   // $1.00
export const FIVE_USDC = 5_000_000n;  // $5.00
export const TEN_USDC = 10_000_000n;  // $10.00
