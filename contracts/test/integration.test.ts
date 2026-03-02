import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  deployFixture,
  createTestMarket,
  placeOrderHelper,
  FIVE_USDC,
  TEN_USDC,
  FEE_BPS,
  BPS_DENOMINATOR,
} from "./helpers";

describe("Integration Tests", function () {
  it("Full lifecycle: create → bet → match → settle → claim", async function () {
    const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();

    // 1. Create market
    const { market, marketAddr } = await createTestMarket(
      factory, bot, "ipl-match-1", 0, "CSK", "MI"
    );

    // 2. Place orders
    const sixUsdc = 6_000_000n;
    const fourUsdc = 4_000_000n;
    await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc); // YES at 60
    await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc); // NO at 40

    // 3. Verify match
    expect(await market.getMatchedPairsCount()).to.equal(1);
    const totalVolume = await market.getTotalVolume();
    expect(totalVolume).to.equal(sixUsdc + fourUsdc);

    // 4. Settle: YES wins
    await oracle.connect(bot).reportResult(marketAddr, 1);
    expect(await market.isSettled()).to.equal(true);
    expect(await market.outcome()).to.equal(1);

    // 5. Winner claims
    const balBefore = await usdc.balanceOf(userA.address);
    await market.connect(userA).claimWinnings();
    const balAfter = await usdc.balanceOf(userA.address);

    const totalPot = sixUsdc + fourUsdc;
    const fee = (totalPot * FEE_BPS) / BPS_DENOMINATOR;
    expect(balAfter - balBefore).to.equal(totalPot - fee);

    // 6. Loser gets nothing
    await expect(market.connect(userB).claimWinnings())
      .to.be.revertedWith("No winnings");
  });

  it("Partial fills with 3 users at different amounts", async function () {
    const { bot, userA, userB, userC, usdc, oracle, factory } = await deployFixture();
    const { market, marketAddr } = await createTestMarket(factory, bot);

    // A: YES $10 at 60
    await placeOrderHelper(market, usdc, userA, 1, 60, TEN_USDC);

    // B: NO $2 at 40
    await placeOrderHelper(market, usdc, userB, 2, 40, 2_000_000n);

    // C: NO $3 at 40
    await placeOrderHelper(market, usdc, userC, 2, 40, 3_000_000n);

    // A should have 2 matched pairs
    expect(await market.getMatchedPairsCount()).to.equal(2);

    // A still has unmatched
    const orderA = await market.orders(0);
    expect(orderA.unmatchedAmount).to.be.gt(0n);

    // Settle YES wins
    await oracle.connect(bot).reportResult(marketAddr, 1);

    // A claims all (winnings + refund)
    const balBefore = await usdc.balanceOf(userA.address);
    await market.connect(userA).claimAll();
    const balAfter = await usdc.balanceOf(userA.address);
    expect(balAfter - balBefore).to.be.gt(0n);
  });

  it("Two markets per match: toss + match winner, independent settlement", async function () {
    const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();

    const matchId = "ipl-2026-match-5";
    const closingTime = (await time.latest()) + 3600;

    // Create 2 markets
    await factory.connect(bot).createMarket(matchId, 0, "RCB", "KKR", closingTime);
    await factory.connect(bot).createMarket(matchId, 1, "RCB", "KKR", closingTime);

    const markets = await factory.getMarketsByMatch(matchId);
    expect(markets.length).to.equal(2);

    const matchMarket = await ethers.getContractAt("CricketXMarket", markets[0]);
    const tossMarket = await ethers.getContractAt("CricketXMarket", markets[1]);

    // Place orders on toss market
    await placeOrderHelper(tossMarket, usdc, userA, 1, 50, FIVE_USDC);
    await placeOrderHelper(tossMarket, usdc, userB, 2, 50, FIVE_USDC);

    // Settle toss (YES = RCB wins toss)
    await oracle.connect(bot).reportResult(markets[1], 1);

    // Toss market settled, match market still open
    expect(await tossMarket.isSettled()).to.equal(true);
    expect(await matchMarket.isSettled()).to.equal(false);

    // Can still place orders on match market
    await placeOrderHelper(matchMarket, usdc, userA, 1, 70, FIVE_USDC);
  });

  it("Bot-simulated cron flow: create market, settle later", async function () {
    const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();

    // Bot creates market (simulating cron job 1)
    const closingTime = (await time.latest()) + 7200; // 2 hours
    await factory.connect(bot).createMarket("cron-match", 0, "DC", "SRH", closingTime);
    const markets = await factory.getMarkets();
    const marketAddr = markets[0];
    const market = await ethers.getContractAt("CricketXMarket", marketAddr);

    // Users place orders
    await placeOrderHelper(market, usdc, userA, 1, 55, FIVE_USDC);
    await placeOrderHelper(market, usdc, userB, 2, 45, FIVE_USDC);

    // Time passes, match ends
    await time.increase(7201);

    // Bot settles (simulating cron job 3)
    await oracle.connect(bot).reportResult(marketAddr, 2); // NO wins

    // Users claim
    await market.connect(userB).claimWinnings();
    const payout = await usdc.balanceOf(userB.address);
    expect(payout).to.be.gt(0n);
  });

  it("Edge case: min bet and max bet both work", async function () {
    const { bot, userA, userB, usdc, factory } = await deployFixture();
    const { market } = await createTestMarket(factory, bot);

    // Min bet: $0.10
    await placeOrderHelper(market, usdc, userA, 1, 50, 100_000n);
    expect(await market.getOrdersCount()).to.equal(1);

    // Max bet: $10.00
    await placeOrderHelper(market, usdc, userB, 2, 50, 10_000_000n);
    expect(await market.getOrdersCount()).to.equal(2);
    expect(await market.getMatchedPairsCount()).to.equal(1);
  });
});
