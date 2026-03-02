import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture } from "./helpers";

describe("CricketXMarketFactory", function () {
  it("createMarket deploys a new market and stores address", async function () {
    const { bot, factory } = await deployFixture();
    const closingTime = (await time.latest()) + 3600;

    const tx = await factory.connect(bot).createMarket(
      "match-1", 0, "CSK", "MI", closingTime
    );

    await expect(tx).to.emit(factory, "MarketCreated");
    expect(await factory.getMarketsCount()).to.equal(1);
  });

  it("isValidMarket returns true for factory-created markets", async function () {
    const { bot, factory } = await deployFixture();
    const closingTime = (await time.latest()) + 3600;

    await factory.connect(bot).createMarket("match-1", 0, "CSK", "MI", closingTime);
    const markets = await factory.getMarkets();

    expect(await factory.isValidMarket(markets[0])).to.equal(true);
  });

  it("isValidMarket returns false for random address", async function () {
    const { factory } = await deployFixture();
    const random = ethers.Wallet.createRandom().address;
    expect(await factory.isValidMarket(random)).to.equal(false);
  });

  it("getMarketsByMatch returns correct markets", async function () {
    const { bot, factory } = await deployFixture();
    const closingTime = (await time.latest()) + 3600;

    await factory.connect(bot).createMarket("match-1", 0, "CSK", "MI", closingTime);
    await factory.connect(bot).createMarket("match-1", 1, "CSK", "MI", closingTime);

    const markets = await factory.getMarketsByMatch("match-1");
    expect(markets.length).to.equal(2);
  });

  it("reverts when unauthorized user tries to create", async function () {
    const { factory, randomUser } = await deployFixture();
    const closingTime = (await time.latest()) + 3600;

    await expect(
      factory.connect(randomUser).createMarket("match-1", 0, "CSK", "MI", closingTime)
    ).to.be.revertedWith("Not authorized");
  });

  it("reverts with invalid closing time (in the past)", async function () {
    const { bot, factory } = await deployFixture();
    const pastTime = (await time.latest()) - 100;

    await expect(
      factory.connect(bot).createMarket("match-1", 0, "CSK", "MI", pastTime)
    ).to.be.revertedWith("Invalid closing time");
  });
});
