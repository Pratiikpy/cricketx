import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  deployFixture,
  createTestMarket,
  placeOrderHelper,
  MIN_BET,
  MAX_BET,
  ONE_USDC,
  FIVE_USDC,
  TEN_USDC,
  FEE_BPS,
  BPS_DENOMINATOR,
} from "./helpers";

describe("CricketXMarket", function () {
  // ============================================================
  // ORDER PLACEMENT
  // ============================================================
  describe("placeOrder", function () {
    it("creates order with correct values", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);

      const order = await market.orders(0);
      expect(order.user).to.equal(userA.address);
      expect(order.side).to.equal(1);
      expect(order.price).to.equal(60);
      expect(order.totalAmount).to.equal(FIVE_USDC);
      expect(order.unmatchedAmount).to.equal(FIVE_USDC);
      expect(order.isActive).to.equal(true);
    });

    it("transfers USDC from user to contract", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      const balBefore = await usdc.balanceOf(userA.address);
      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      const balAfter = await usdc.balanceOf(userA.address);

      expect(balBefore - balAfter).to.equal(FIVE_USDC);
    });

    it("reverts if market is closed", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await time.increase(3601);

      await usdc.connect(userA).approve(await market.getAddress(), FIVE_USDC);
      await expect(market.connect(userA).placeOrder(1, 60, FIVE_USDC))
        .to.be.revertedWith("Market closed");
    });

    it("reverts if market is settled", async function () {
      const { bot, userA, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      await oracle.connect(bot).reportResult(marketAddr, 1);

      await usdc.connect(userA).approve(await market.getAddress(), FIVE_USDC);
      await expect(market.connect(userA).placeOrder(1, 60, FIVE_USDC))
        .to.be.revertedWith("Market settled");
    });

    it("reverts if market is paused", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      // Factory is the owner of the market
      const factoryAddr = await factory.getAddress();
      const factorySigner = await ethers.getImpersonatedSigner(factoryAddr);
      await ethers.provider.send("hardhat_setBalance", [factoryAddr, "0x56BC75E2D63100000"]);
      await market.connect(factorySigner).emergencyPause();

      await usdc.connect(userA).approve(await market.getAddress(), FIVE_USDC);
      await expect(market.connect(userA).placeOrder(1, 60, FIVE_USDC))
        .to.be.revertedWith("Market paused");
    });

    it("reverts if price is 0", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await usdc.connect(userA).approve(await market.getAddress(), FIVE_USDC);
      await expect(market.connect(userA).placeOrder(1, 0, FIVE_USDC))
        .to.be.revertedWith("Invalid price");
    });

    it("reverts if price is 100", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await usdc.connect(userA).approve(await market.getAddress(), FIVE_USDC);
      await expect(market.connect(userA).placeOrder(1, 100, FIVE_USDC))
        .to.be.revertedWith("Invalid price");
    });

    it("reverts if amount below min bet", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      const tooSmall = MIN_BET - 1n;
      await usdc.connect(userA).approve(await market.getAddress(), tooSmall);
      await expect(market.connect(userA).placeOrder(1, 60, tooSmall))
        .to.be.revertedWith("Below min bet");
    });

    it("reverts if amount above max bet", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      const tooLarge = MAX_BET + 1n;
      await usdc.mint(userA.address, tooLarge);
      await usdc.connect(userA).approve(await market.getAddress(), tooLarge);
      await expect(market.connect(userA).placeOrder(1, 60, tooLarge))
        .to.be.revertedWith("Above max bet");
    });

    it("reverts if invalid side (0)", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await usdc.connect(userA).approve(await market.getAddress(), FIVE_USDC);
      await expect(market.connect(userA).placeOrder(0, 60, FIVE_USDC))
        .to.be.revertedWith("Invalid side");
    });

    it("emits OrderPlaced event", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await usdc.connect(userA).approve(await market.getAddress(), FIVE_USDC);
      await expect(market.connect(userA).placeOrder(1, 60, FIVE_USDC))
        .to.emit(market, "OrderPlaced");
    });
  });

  // ============================================================
  // ORDER MATCHING
  // ============================================================
  describe("Order Matching", function () {
    it("YES at 60 matches with NO at 40 automatically", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      // UserA: YES at 60 for $5
      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      // UserB: NO at 40 for $5
      // At price 40, $5 buys 5000000/40=125000 shares
      // UserA has 5000000/60=83333 shares
      // Match min(83333, 125000)=83333 shares
      const noAmount = FIVE_USDC;
      await placeOrderHelper(market, usdc, userB, 2, 40, noAmount);

      expect(await market.getMatchedPairsCount()).to.equal(1);

      const pair = (await market.getMatchedPairs())[0];
      expect(pair.yesUser).to.equal(userA.address);
      expect(pair.noUser).to.equal(userB.address);
      expect(pair.yesPrice).to.equal(60);
      expect(pair.noPrice).to.equal(40);
    });

    it("YES at 60 does NOT match with NO at 50", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      await placeOrderHelper(market, usdc, userB, 2, 50, FIVE_USDC);

      // 60 + 50 = 110 != 100, no match
      expect(await market.getMatchedPairsCount()).to.equal(0);
    });

    it("partial fill: YES $5 at 60 matches with NO $3 at 40", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      // Spec example: Rahul YES $5 at 60, Amit NO $3 at 40
      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      const threeUsdc = 3_000_000n;
      await placeOrderHelper(market, usdc, userB, 2, 40, threeUsdc);

      // Shares: A=5000000/60=83333, B=3000000/40=75000
      // Match 75000 shares
      // A consumed: 75000*60=4500000, B consumed: 75000*40=3000000
      const orderA = await market.orders(0);
      expect(orderA.matchedAmount).to.equal(4_500_000n);
      expect(orderA.unmatchedAmount).to.equal(500_000n); // $0.50 remaining
      expect(orderA.isActive).to.equal(true); // still has unmatched

      const orderB = await market.orders(1);
      expect(orderB.matchedAmount).to.equal(3_000_000n);
      expect(orderB.unmatchedAmount).to.equal(0n);
      expect(orderB.isActive).to.equal(false); // fully matched
    });

    it("multiple partial fills on single order", async function () {
      const { bot, userA, userB, userC, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      // A: YES $10 at 60
      await placeOrderHelper(market, usdc, userA, 1, 60, TEN_USDC);

      // B: NO $2 at 40
      const twoUsdc = 2_000_000n;
      await placeOrderHelper(market, usdc, userB, 2, 40, twoUsdc);

      // C: NO $3 at 40
      const threeUsdc = 3_000_000n;
      await placeOrderHelper(market, usdc, userC, 2, 40, threeUsdc);

      expect(await market.getMatchedPairsCount()).to.equal(2);

      // A should have matched with both B and C
      const orderA = await market.orders(0);
      // B: 2000000/40=50000 shares, consumed from A: 50000*60=3000000
      // C: 3000000/40=75000 shares, consumed from A: 75000*60=4500000
      // Total matched from A: 3000000+4500000=7500000
      expect(orderA.matchedAmount).to.equal(7_500_000n);
      expect(orderA.unmatchedAmount).to.equal(2_500_000n);
    });

    it("MatchedPair has correct yesAmount and noAmount", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      const threeUsdc = 3_000_000n;
      await placeOrderHelper(market, usdc, userB, 2, 40, threeUsdc);

      const pair = (await market.getMatchedPairs())[0];
      // 75000 shares matched
      expect(pair.yesAmount).to.equal(4_500_000n); // 75000*60
      expect(pair.noAmount).to.equal(3_000_000n);  // 75000*40
      expect(pair.amount).to.equal(7_500_000n);     // total locked
    });

    it("order becomes inactive when fully matched", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      // Both place same effective amount for exact match
      // A: YES $6 at 60 → 100000 shares
      const sixUsdc = 6_000_000n;
      await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc);
      // B: NO $4 at 40 → 100000 shares (exact match)
      const fourUsdc = 4_000_000n;
      await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc);

      const orderA = await market.orders(0);
      expect(orderA.isActive).to.equal(false);
      const orderB = await market.orders(1);
      expect(orderB.isActive).to.equal(false);
    });
  });

  // ============================================================
  // CANCELLATION
  // ============================================================
  describe("cancelOrder", function () {
    it("refunds unmatched USDC to user", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);

      const balBefore = await usdc.balanceOf(userA.address);
      await market.connect(userA).cancelOrder(0);
      const balAfter = await usdc.balanceOf(userA.address);

      expect(balAfter - balBefore).to.equal(FIVE_USDC);
    });

    it("only refunds unmatched portion (not matched)", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      const threeUsdc = 3_000_000n;
      await placeOrderHelper(market, usdc, userB, 2, 40, threeUsdc);

      // A has $0.50 unmatched (500000 units)
      const balBefore = await usdc.balanceOf(userA.address);
      await market.connect(userA).cancelOrder(0);
      const balAfter = await usdc.balanceOf(userA.address);

      expect(balAfter - balBefore).to.equal(500_000n);
    });

    it("reverts if called by non-owner of order", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);

      await expect(market.connect(userB).cancelOrder(0))
        .to.be.revertedWith("Not order owner");
    });

    it("reverts if nothing to cancel", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      await market.connect(userA).cancelOrder(0);

      await expect(market.connect(userA).cancelOrder(0))
        .to.be.revertedWith("Nothing to cancel");
    });

    it("works after closingTime", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      await time.increase(3601);

      await expect(market.connect(userA).cancelOrder(0)).to.not.be.reverted;
    });

    it("works after settlement", async function () {
      const { bot, userA, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      await oracle.connect(bot).reportResult(marketAddr, 1);

      await expect(market.connect(userA).cancelOrder(0)).to.not.be.reverted;
    });
  });

  // ============================================================
  // SETTLEMENT
  // ============================================================
  describe("settle", function () {
    it("sets isSettled and stores outcome", async function () {
      const { bot, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      await oracle.connect(bot).reportResult(marketAddr, 1);

      expect(await market.isSettled()).to.equal(true);
      expect(await market.outcome()).to.equal(1);
    });

    it("reverts when called by non-oracle", async function () {
      const { bot, userA, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await expect(market.connect(userA).settle(1))
        .to.be.revertedWith("Not oracle");
    });

    it("reverts if already settled", async function () {
      const { bot, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      await oracle.connect(bot).reportResult(marketAddr, 1);

      await expect(oracle.connect(bot).reportResult(marketAddr, 2))
        .to.be.revertedWith("Already settled");
    });

    it("emits MarketSettled event", async function () {
      const { bot, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      await expect(oracle.connect(bot).reportResult(marketAddr, 1))
        .to.emit(market, "MarketSettled");
    });
  });

  // ============================================================
  // CLAIMS & REFUNDS
  // ============================================================
  describe("claimWinnings", function () {
    it("sends correct USDC to YES winner when YES wins", async function () {
      const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      // A: YES $6 at 60, B: NO $4 at 40 → exact match at 100k shares
      const sixUsdc = 6_000_000n;
      const fourUsdc = 4_000_000n;
      await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc);
      await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc);

      // Settle YES wins
      await oracle.connect(bot).reportResult(marketAddr, 1);

      const balBefore = await usdc.balanceOf(userA.address);
      await market.connect(userA).claimWinnings();
      const balAfter = await usdc.balanceOf(userA.address);

      // Total pot = 6+4 = $10. Fee = 2% of $10 = $0.20. Net = $9.80
      const totalPot = sixUsdc + fourUsdc;
      const fee = (totalPot * FEE_BPS) / BPS_DENOMINATOR;
      const expected = totalPot - fee;
      expect(balAfter - balBefore).to.equal(expected);
    });

    it("sends correct USDC to NO winner when NO wins", async function () {
      const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      const sixUsdc = 6_000_000n;
      const fourUsdc = 4_000_000n;
      await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc);
      await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc);

      // Settle NO wins
      await oracle.connect(bot).reportResult(marketAddr, 2);

      const balBefore = await usdc.balanceOf(userB.address);
      await market.connect(userB).claimWinnings();
      const balAfter = await usdc.balanceOf(userB.address);

      const totalPot = sixUsdc + fourUsdc;
      const fee = (totalPot * FEE_BPS) / BPS_DENOMINATOR;
      expect(balAfter - balBefore).to.equal(totalPot - fee);
    });

    it("deducts exactly 2% fee", async function () {
      const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      const sixUsdc = 6_000_000n;
      const fourUsdc = 4_000_000n;
      await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc);
      await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc);

      await oracle.connect(bot).reportResult(marketAddr, 1);
      await market.connect(userA).claimWinnings();

      const totalPot = sixUsdc + fourUsdc;
      const expectedFee = (totalPot * FEE_BPS) / BPS_DENOMINATOR;
      expect(await market.totalFees()).to.equal(expectedFee);
    });

    it("handles user with multiple matched pairs", async function () {
      const { bot, userA, userB, userC, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      // A: YES $10 at 60
      await placeOrderHelper(market, usdc, userA, 1, 60, TEN_USDC);
      // B: NO $2 at 40
      await placeOrderHelper(market, usdc, userB, 2, 40, 2_000_000n);
      // C: NO $3 at 40
      await placeOrderHelper(market, usdc, userC, 2, 40, 3_000_000n);

      await oracle.connect(bot).reportResult(marketAddr, 1);

      // A should get winnings from both pairs
      const balBefore = await usdc.balanceOf(userA.address);
      await market.connect(userA).claimWinnings();
      const balAfter = await usdc.balanceOf(userA.address);

      expect(balAfter - balBefore).to.be.gt(0n);
    });

    it("reverts if called before settlement", async function () {
      const { bot, userA, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);

      await expect(market.connect(userA).claimWinnings())
        .to.be.revertedWith("Not settled");
    });

    it("reverts if called twice", async function () {
      const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      const sixUsdc = 6_000_000n;
      const fourUsdc = 4_000_000n;
      await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc);
      await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc);

      await oracle.connect(bot).reportResult(marketAddr, 1);
      await market.connect(userA).claimWinnings();

      await expect(market.connect(userA).claimWinnings())
        .to.be.revertedWith("Already claimed");
    });

    it("reverts for losing side (no winnings)", async function () {
      const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      const sixUsdc = 6_000_000n;
      const fourUsdc = 4_000_000n;
      await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc);
      await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc);

      // YES wins — B (NO side) loses
      await oracle.connect(bot).reportResult(marketAddr, 1);

      await expect(market.connect(userB).claimWinnings())
        .to.be.revertedWith("No winnings");
    });
  });

  describe("refundUnmatched", function () {
    it("returns correct USDC for unmatched orders", async function () {
      const { bot, userA, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      // No counterparty — fully unmatched

      await oracle.connect(bot).reportResult(marketAddr, 1);

      const balBefore = await usdc.balanceOf(userA.address);
      await market.connect(userA).refundUnmatched();
      const balAfter = await usdc.balanceOf(userA.address);

      expect(balAfter - balBefore).to.equal(FIVE_USDC);
    });

    it("reverts if called twice", async function () {
      const { bot, userA, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      await oracle.connect(bot).reportResult(marketAddr, 1);
      await market.connect(userA).refundUnmatched();

      await expect(market.connect(userA).refundUnmatched())
        .to.be.revertedWith("Already refunded");
    });
  });

  describe("claimAll", function () {
    it("claims winnings + refund in one transaction", async function () {
      const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      // A: YES $5 at 60, B: NO $3 at 40
      // A has $0.50 unmatched + winnings from 75000 shares
      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      await placeOrderHelper(market, usdc, userB, 2, 40, 3_000_000n);

      await oracle.connect(bot).reportResult(marketAddr, 1);

      const balBefore = await usdc.balanceOf(userA.address);
      await market.connect(userA).claimAll();
      const balAfter = await usdc.balanceOf(userA.address);

      // Winnings: pot=4500000+3000000=7500000, fee=150000, net=7350000
      // Refund: 500000
      // Total: 7350000+500000=7850000
      const received = balAfter - balBefore;
      expect(received).to.equal(7_850_000n);
    });
  });

  // ============================================================
  // VIEW FUNCTIONS
  // ============================================================
  describe("View Functions", function () {
    it("getOrderBook returns active orders split by side", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      await placeOrderHelper(market, usdc, userA, 1, 60, FIVE_USDC);
      await placeOrderHelper(market, usdc, userB, 2, 50, FIVE_USDC); // won't match

      const [yesOrders, noOrders] = await market.getOrderBook();
      expect(yesOrders.length).to.equal(1);
      expect(noOrders.length).to.equal(1);
    });

    it("getUserPayout returns correct net payout", async function () {
      const { bot, userA, userB, usdc, oracle, factory } = await deployFixture();
      const { market, marketAddr } = await createTestMarket(factory, bot);

      const sixUsdc = 6_000_000n;
      const fourUsdc = 4_000_000n;
      await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc);
      await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc);

      await oracle.connect(bot).reportResult(marketAddr, 1);

      const payout = await market.getUserPayout(userA.address);
      const totalPot = sixUsdc + fourUsdc;
      const fee = (totalPot * FEE_BPS) / BPS_DENOMINATOR;
      expect(payout).to.equal(totalPot - fee);
    });

    it("getTotalVolume returns sum of matched amounts", async function () {
      const { bot, userA, userB, usdc, factory } = await deployFixture();
      const { market } = await createTestMarket(factory, bot);

      const sixUsdc = 6_000_000n;
      const fourUsdc = 4_000_000n;
      await placeOrderHelper(market, usdc, userA, 1, 60, sixUsdc);
      await placeOrderHelper(market, usdc, userB, 2, 40, fourUsdc);

      expect(await market.getTotalVolume()).to.equal(sixUsdc + fourUsdc);
    });
  });
});
