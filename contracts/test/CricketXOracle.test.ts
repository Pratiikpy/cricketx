import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, createTestMarket } from "./helpers";

describe("CricketXOracle", function () {
  it("reportResult succeeds when called by authorized bot", async function () {
    const { bot, oracle, factory } = await deployFixture();
    const { marketAddr } = await createTestMarket(factory, bot);

    // Advance time past closing
    await time.increase(3601);

    await expect(oracle.connect(bot).reportResult(marketAddr, 1))
      .to.emit(oracle, "ResultReported")
      .withArgs(marketAddr, 1, await time.latest() + 1);
  });

  it("reportResult reverts when called by random address", async function () {
    const { bot, oracle, factory, randomUser } = await deployFixture();
    const { marketAddr } = await createTestMarket(factory, bot);

    await expect(oracle.connect(randomUser).reportResult(marketAddr, 1))
      .to.be.revertedWith("Not authorized bot");
  });

  it("reportResult reverts with invalid outcome (0)", async function () {
    const { bot, oracle, factory } = await deployFixture();
    const { marketAddr } = await createTestMarket(factory, bot);

    await expect(oracle.connect(bot).reportResult(marketAddr, 0))
      .to.be.revertedWith("Invalid outcome");
  });

  it("reportResult reverts with invalid outcome (3)", async function () {
    const { bot, oracle, factory } = await deployFixture();
    const { marketAddr } = await createTestMarket(factory, bot);

    await expect(oracle.connect(bot).reportResult(marketAddr, 3))
      .to.be.revertedWith("Invalid outcome");
  });

  it("reportResult reverts for non-existent market address", async function () {
    const { bot, oracle } = await deployFixture();
    const fakeMarket = ethers.Wallet.createRandom().address;

    await expect(oracle.connect(bot).reportResult(fakeMarket, 1))
      .to.be.revertedWith("Not a valid market");
  });

  it("emergencySettle reverts before 48 hour timeout", async function () {
    const { bot, owner, oracle, factory } = await deployFixture();
    const { marketAddr } = await createTestMarket(factory, bot);

    // Only advance 24 hours past closing
    await time.increase(3600 + 24 * 3600);

    await expect(oracle.connect(owner).emergencySettle(marketAddr, 1))
      .to.be.revertedWith("Too early for emergency");
  });

  it("emergencySettle succeeds after 48 hour timeout", async function () {
    const { bot, owner, oracle, factory } = await deployFixture();
    const { marketAddr } = await createTestMarket(factory, bot);

    // Advance past closing + 48 hours + 1 second
    await time.increase(3600 + 48 * 3600 + 1);

    await expect(oracle.connect(owner).emergencySettle(marketAddr, 1))
      .to.emit(oracle, "ResultReported");
  });

  it("setAuthorizedBot updates the bot address", async function () {
    const { owner, oracle, randomUser } = await deployFixture();
    const newBot = randomUser.address;

    await expect(oracle.connect(owner).setAuthorizedBot(newBot))
      .to.emit(oracle, "AuthorizedBotUpdated");

    expect(await oracle.authorizedBot()).to.equal(newBot);
  });

  it("setAuthorizedBot reverts when called by non-owner", async function () {
    const { oracle, randomUser } = await deployFixture();

    await expect(oracle.connect(randomUser).setAuthorizedBot(randomUser.address))
      .to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
  });
});
