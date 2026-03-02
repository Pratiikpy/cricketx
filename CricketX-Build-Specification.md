# CricketX — Complete Build Specification

**Version 1.0 | March 2, 2026 | For Claude Code CLI**

---

## 1. Build Overview

CricketX is a peer-to-peer cricket prediction market on Base blockchain. Users bet on cricket match outcomes using USDC. Bets are matched against other users through an order book model. The platform takes 2% fee from winners.

### What We Are Building

| Component | Language | Lines (est) | Purpose |
|-----------|----------|-------------|---------|
| CricketXOracle.sol | Solidity | ~50 | Receives match results from bot, forwards to markets |
| CricketXMarket.sol | Solidity | ~300 | Order book, matching, escrow, settlement, payouts |
| CricketXMarketFactory.sol | Solidity | ~70 | Creates new market instances, stores registry |
| Deploy scripts | JavaScript | ~80 | Hardhat deploy to Base testnet and mainnet |
| Unit tests | JavaScript | ~200 | Full coverage of all contract functions |
| Oracle Bot | Node.js | ~150 | CricAPI integration, auto-create and settle markets |
| Farcaster Agent | Node.js | ~100 | Social posting, market announcements, results |

### Build Order (follow this exact sequence)

1. Project setup: Initialize Hardhat project, install OpenZeppelin, configure Base network
2. CricketXOracle.sol: Simplest contract, build and test first
3. CricketXMarket.sol: The core logic, most complex, build and test thoroughly
4. CricketXMarketFactory.sol: Wires Oracle and Market together
5. Deploy scripts: Deploy all 3 contracts to Base Sepolia testnet
6. Unit tests: Test every function, every edge case
7. Oracle Bot: Node.js cron that creates markets and settles them
8. Farcaster Agent: Social layer, can be added to the bot
9. Frontend integration: Connect Lovable frontend to real contracts
10. Testnet testing: Full end-to-end with fake USDC
11. Mainnet deploy: Go live on Base mainnet

### Key Constants

| Constant | Value | Notes |
|----------|-------|-------|
| USDC Address (Base mainnet) | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 | Base USDC contract |
| USDC Address (Base Sepolia) | Deploy mock ERC20 for testing | |
| USDC Decimals | 6 | 1 USDC = 1000000 units |
| Platform Fee | 2% (200 basis points) | Deducted from winning payouts |
| Min Bet | $0.10 = 100000 USDC units | |
| Max Bet | $10.00 = 10000000 USDC units | |
| Price Range | 1 to 99 | YES price + NO price = 100 always |
| Settlement Delay | 120 seconds | Buffer after oracle receives result |

---

## 2. Project Setup and Dependencies

### Initialize Project

```
mkdir cricketx-contracts && cd cricketx-contracts
npx hardhat init  (choose TypeScript project)
npm install @openzeppelin/contracts
npm install dotenv
```

### OpenZeppelin Imports Needed

- IERC20.sol — interface to interact with USDC token contract
- Ownable.sol — access control, only owner can call admin functions
- ReentrancyGuard.sol — prevents reentrancy attacks on claim/refund functions
- Pausable.sol — emergency stop mechanism, owner can pause all operations

### Hardhat Config for Base

Configure hardhat.config.ts with Base Sepolia testnet and Base mainnet networks. Base Sepolia RPC: https://sepolia.base.org. Base Mainnet RPC: https://mainnet.base.org. Chain IDs: Sepolia = 84532, Mainnet = 8453.

### Folder Structure

```
contracts/
  CricketXOracle.sol
  CricketXMarket.sol
  CricketXMarketFactory.sol
scripts/
  deploy.ts
test/
  CricketXOracle.test.ts
  CricketXMarket.test.ts
  CricketXMarketFactory.test.ts
  integration.test.ts
bot/
  index.ts
  cricapi.ts
  settlements.ts
  farcaster.ts
.env
```

---

## 3. CONTRACT 1: CricketXOracle.sol (The Result Pusher)

The simplest contract. It receives match results from an authorized bot and forwards them to the correct market contract for settlement.

### State Variables

- **owner** (address): Contract deployer, can update settings
- **authorizedBot** (address): The only wallet allowed to push results
- **factory** (address): Reference to CricketXMarketFactory for validation

### Functions

#### constructor(address _authorizedBot)

Sets the deployer as owner. Sets the authorized bot address. This is the wallet address of the Node.js oracle bot that will call this contract.

#### reportResult(address marketAddress, uint8 outcome)

This is the main function. The bot calls this after a cricket match ends or after a toss happens.

Parameters: marketAddress is the address of the specific CricketXMarket contract to settle. outcome is 1 for YES wins or 2 for NO wins.

Validations:
- require(msg.sender == authorizedBot) — only the bot can call this
- require(outcome == 1 || outcome == 2) — must be valid outcome
- Validate that marketAddress is a real market created by our factory (call factory.isValidMarket(marketAddress))

Action: Calls CricketXMarket(marketAddress).settle(outcome). This triggers the settlement process in the market contract.

Emit event: ResultReported(marketAddress, outcome, block.timestamp)

#### emergencySettle(address marketAddress, uint8 outcome)

Fallback function for owner only. If the bot goes offline and a market has not been settled for 48 hours past its closing time, the owner can manually push the result.

Validations:
- require(msg.sender == owner) — only owner
- require(outcome == 1 || outcome == 2)
- require(block.timestamp > market.closingTime + 48 hours) — can only be used after 48hr timeout

Action: Same as reportResult, calls market.settle(outcome).

#### setAuthorizedBot(address _newBot)

Owner-only function to update the bot wallet address. Useful if you need to rotate keys.

#### setFactory(address _factory)

Owner-only function to set the factory contract address. Called once after deploying all contracts.

---

## 4. CONTRACT 2: CricketXMarket.sol (The Brain)

This is the core contract. One instance is deployed per market (so 2 per IPL match: one for Match Winner, one for Toss Winner). It handles the complete lifecycle: order placement, order matching with partial fills, USDC escrow, settlement, winner payouts, and loser/unmatched refunds.

### State Variables

- **oracle** (address): CricketXOracle contract address, only entity that can settle
- **treasury** (address): Wallet that receives 2% platform fees
- **usdc** (IERC20): Reference to USDC token contract on Base
- **matchId** (string): CricAPI match ID (e.g., "2d448290-d882-...")
- **marketType** (enum: MATCH_WINNER, TOSS_WINNER): Type of market, used by bot for settlement scheduling
- **teamA** (string): First team name (e.g., "Chennai Super Kings")
- **teamB** (string): Second team name (e.g., "Mumbai Indians")
- **closingTime** (uint256): Unix timestamp after which no new orders accepted
- **isSettled** (bool): True after oracle pushes result
- **outcome** (uint8): 0 = not settled, 1 = YES wins, 2 = NO wins
- **isPaused** (bool): Emergency pause flag
- **totalFees** (uint256): Accumulated platform fees to be withdrawn
- **orders** (Order[]): Array of all orders placed
- **matchedPairs** (MatchedPair[]): Array of all matched order pairs
- **userOrders** (mapping(address => uint256[])): Maps user address to their order indices
- **hasClaimed** (mapping(address => bool)): Tracks if user has claimed winnings
- **hasRefunded** (mapping(address => bool)): Tracks if user has refunded unmatched orders

### Data Structures

#### Order struct

- **user** (address): Who placed this order
- **side** (uint8): 1 = YES, 2 = NO
- **price** (uint256): Price in cents (1-99). YES at 60 means user pays $0.60 per share
- **totalAmount** (uint256): Total USDC deposited for this order
- **matchedAmount** (uint256): How much of totalAmount has been matched so far
- **unmatchedAmount** (uint256): totalAmount - matchedAmount, available for matching or cancellation
- **isActive** (bool): False if fully matched or cancelled
- **timestamp** (uint256): When the order was placed

#### MatchedPair struct

Every time two orders are matched (partially or fully), a MatchedPair is created. This is critical for correct payout calculation because different users may have matched at different prices.

- **yesUser** (address): User who bet YES
- **noUser** (address): User who bet NO
- **yesPrice** (uint256): Price the YES user paid (e.g., 60)
- **noPrice** (uint256): Price the NO user paid (e.g., 40). Always 100 - yesPrice
- **amount** (uint256): Total USDC locked in this pair (yesAmount + noAmount)
- **yesAmount** (uint256): USDC the YES user contributed to this pair
- **noAmount** (uint256): USDC the NO user contributed to this pair

### Functions — Complete Logic

#### constructor(...)

Called by the Factory when creating a new market. Receives: oracle address, treasury address, USDC token address, matchId, marketType, teamA, teamB, closingTime. Stores all values. Sets isSettled = false, outcome = 0.

---

#### placeOrder(uint8 side, uint256 price, uint256 amount)

This is the main user-facing function. A user calls this to place a YES or NO prediction.

**STEP 1 — VALIDATE INPUTS:**

- require(!isPaused) — market not paused
- require(!isSettled) — market not already settled
- require(block.timestamp < closingTime) — market still accepting orders
- require(side == 1 || side == 2) — must be YES (1) or NO (2)
- require(price >= 1 && price <= 99) — valid price range
- require(amount >= 100000) — minimum bet $0.10 in USDC units (6 decimals)
- require(amount <= 10000000) — maximum bet $10.00 in USDC units

**STEP 2 — TRANSFER USDC FROM USER:**

Call usdc.transferFrom(msg.sender, address(this), amount). The user must have previously approved this contract to spend their USDC. If transfer fails, transaction reverts.

**STEP 3 — CREATE ORDER:**

Create a new Order struct with: user = msg.sender, side = side, price = price, totalAmount = amount, matchedAmount = 0, unmatchedAmount = amount, isActive = true, timestamp = block.timestamp. Push to orders array. Store the order index in userOrders[msg.sender].

**STEP 4 — TRY TO MATCH (CRITICAL — THE CORE ALGORITHM):**

After placing the order, immediately try to match it against existing orders on the opposite side.

Loop through all existing active orders on the OPPOSITE side. For each opposite order, check if the prices are compatible: newOrder.price + oppositeOrder.price must equal 100. If they are compatible, calculate how much can be matched.

**Worked example:**

Rahul places YES at price 60 for $5.00 (5000000 USDC units). The contract finds Amit's existing NO order at price 40 with $3.00 unmatched (3000000 units). Since 60 + 40 = 100, they are compatible.

Share calculation: Each share costs the user their price in cents. So Rahul's $5.00 at price 60 buys him 5000000 / 60 = 83333 shares. Amit's $3.00 at price 40 buys him 3000000 / 40 = 75000 shares. The matchable shares = min(83333, 75000) = 75000 shares.

This means Rahul uses 75000 × 60 = 4500000 units ($4.50) and Amit uses all 75000 × 40 = 3000000 units ($3.00). Total locked = $7.50. Rahul has $0.50 remaining unmatched.

Create a MatchedPair: yesUser = Rahul, noUser = Amit, yesPrice = 60, noPrice = 40, yesAmount = $4.50, noAmount = $3.00, amount = $7.50.

Update both orders' matchedAmount and unmatchedAmount. If an order's unmatchedAmount reaches 0, set isActive = false.

Continue looping through opposite orders until the new order is fully matched or no more compatible orders exist. Multiple partial matches are possible for a single order.

**STEP 5 — EMIT EVENT:**

Emit OrderPlaced(orderId, msg.sender, side, price, amount, matchedAmount). The frontend listens to these events to update the order book display.

---

#### cancelOrder(uint256 orderId)

User cancels their unmatched order portion and gets USDC back.

Validations:
- require(orders[orderId].user == msg.sender) — must be order owner
- require(orders[orderId].unmatchedAmount > 0) — must have something to cancel
- Note: This works ANYTIME — before closingTime, after closingTime, even after settlement. Users should always be able to recover unmatched funds.

Action: Transfer orders[orderId].unmatchedAmount USDC back to user. Set unmatchedAmount = 0. If matchedAmount is also 0, set isActive = false.

Emit OrderCancelled(orderId, msg.sender, refundedAmount).

---

#### settle(uint8 _outcome)

Called ONLY by the Oracle contract. Finalizes the market with the result.

Validations:
- require(msg.sender == oracle) — only oracle can settle
- require(!isSettled) — cannot settle twice
- require(_outcome == 1 || _outcome == 2) — valid outcome

Action: Set isSettled = true. Set outcome = _outcome. Emit MarketSettled(matchId, marketType, outcome, block.timestamp). After this, no more orders can be placed. Users can now claim winnings and refund unmatched orders.

---

#### claimWinnings()

Winners call this to withdraw their USDC payouts. This is the most complex payout logic.

Validations:
- require(isSettled) — market must be settled
- require(!hasClaimed[msg.sender]) — cannot claim twice
- ReentrancyGuard — prevent reentrancy attack

**PAYOUT CALCULATION (CRITICAL):**

Loop through ALL matchedPairs. For each pair where msg.sender is on the WINNING side, calculate their payout.

If outcome = 1 (YES wins): For each MatchedPair where yesUser == msg.sender, the payout = yesAmount + noAmount. This is because the YES user wins the entire locked amount (both their stake and the NO user's stake).

If outcome = 2 (NO wins): For each MatchedPair where noUser == msg.sender, the payout = yesAmount + noAmount.

Sum up all payouts across all matched pairs for this user. Deduct 2% platform fee: fee = totalPayout × 200 / 10000. Net payout = totalPayout - fee. Add fee to totalFees accumulator.

Transfer net payout USDC to msg.sender. Set hasClaimed[msg.sender] = true.

Emit WinningsClaimed(msg.sender, netPayout, fee).

---

#### refundUnmatched()

Any user with unmatched orders calls this after settlement to get their USDC back. Alternatively they can use cancelOrder at any time, but this is a convenience function that refunds ALL unmatched orders at once.

Validations:
- require(isSettled) — market must be settled
- require(!hasRefunded[msg.sender]) — cannot refund twice

Action: Loop through all orders where orders[i].user == msg.sender and unmatchedAmount > 0. Sum up all unmatched amounts. Transfer total back to user. Set all those orders' unmatchedAmount to 0. Set hasRefunded[msg.sender] = true.

Emit UnmatchedRefunded(msg.sender, totalRefunded).

---

#### withdrawFees()

Owner-only function. Transfers accumulated platform fees to the treasury address. Transfer totalFees USDC to treasury. Reset totalFees to 0.

---

#### sweepDust()

Owner-only function. After ALL users have claimed and refunded, there might be tiny dust amounts left due to rounding in division. This sends any remaining USDC balance to treasury. Should only be called after sufficient time has passed for all claims.

Validation: require(isSettled). require(block.timestamp > settlementTime + 30 days) — give users 30 days to claim before sweeping.

---

#### emergencyPause() / emergencyUnpause()

Owner-only functions. Pauses or unpauses the market. When paused, no new orders can be placed, but cancellations and claims still work.

---

### View Functions (Read-Only, No Gas)

- **getOrderBook()** — Returns all active orders split by YES/NO side with prices and amounts. Frontend uses this to display the order book.
- **getUserOrders(address user)** — Returns all orders for a specific user. Frontend uses this for My Bets page.
- **getUserPayout(address user)** — Returns calculated payout for a user before claiming. Frontend shows potential winnings.
- **getMarketInfo()** — Returns matchId, marketType, teamA, teamB, closingTime, isSettled, outcome. Frontend uses for market card display.
- **getMatchedPairs()** — Returns all matched pairs. Frontend uses for recent trades feed.
- **getTotalVolume()** — Returns sum of all matched amounts. Frontend shows volume on market card.

### Events (Frontend Listens To These)

- **OrderPlaced**(orderId, user, side, price, amount, matchedAmount) — User places new order
- **OrderMatched**(matchedPairId, yesUser, noUser, yesPrice, amount) — Two orders are matched
- **OrderCancelled**(orderId, user, refundedAmount) — User cancels unmatched order
- **MarketSettled**(matchId, marketType, outcome, timestamp) — Oracle pushes result
- **WinningsClaimed**(user, payout, fee) — Winner withdraws USDC
- **UnmatchedRefunded**(user, amount) — User refunds unmatched orders

### Edge Cases Handled

| Edge Case | How It Is Handled |
|-----------|-------------------|
| User places order, nobody matches | Order sits unmatched. User can cancel anytime. Auto-refundable after settlement. |
| User places YES at 60, partial match for 30% of amount | 30% goes into MatchedPair, 70% stays as unmatchedAmount. More matches can come later. |
| User has 5 partial matches at different prices | 5 separate MatchedPairs created. Payout calculated per pair and summed. |
| Market closes, user has unmatched orders | User can call cancelOrder immediately after closingTime. No need to wait for settlement. |
| Oracle pushes result, user is on losing side | User gets $0 from matched pairs. Only gets refund for unmatched portion. |
| User tries to place order after market closed | Reverts: block.timestamp >= closingTime |
| User tries to claim before settlement | Reverts: !isSettled |
| User tries to claim twice | Reverts: hasClaimed[msg.sender] == true |
| USDC transfer fails (user has insufficient balance) | transferFrom reverts, entire transaction fails cleanly |
| Reentrancy attack on claimWinnings | ReentrancyGuard prevents re-entry |
| Oracle tries to settle twice | Reverts: isSettled == true |
| Random person tries to settle | Reverts: msg.sender != oracle |
| Division rounding leaves dust USDC in contract | sweepDust() cleans up after 30 days |
| User places $0.05 bet (below minimum) | Reverts: amount < 100000 |
| User places $50 bet (above maximum) | Reverts: amount > 10000000 |
| Price is 0 or 100 | Reverts: price < 1 or price > 99 |

---

## 5. CONTRACT 3: CricketXMarketFactory.sol (The Market Creator)

This contract creates and tracks all CricketXMarket instances. It is the entry point for market creation.

### State Variables

- **owner** (address): Contract deployer
- **oracle** (address): CricketXOracle contract address
- **treasury** (address): Fee collection wallet
- **usdc** (address): USDC token address on Base
- **authorizedBot** (address): Bot wallet that can create markets
- **allMarkets** (address[]): Array of all market contract addresses
- **matchMarkets** (mapping(string => address[])): Maps matchId to its market addresses
- **isValidMarket** (mapping(address => bool)): Quick lookup for oracle validation

### Enums

MarketType enum: MATCH_WINNER = 0, TOSS_WINNER = 1. This is passed to each market on creation so the bot knows which settlement schedule to use.

### Functions

#### constructor(address _oracle, address _treasury, address _usdc, address _authorizedBot)

Sets all addresses. Deployer becomes owner.

#### createMarket(string matchId, uint8 marketType, string teamA, string teamB, uint256 closingTime)

Creates a new CricketXMarket contract instance.

Validations:
- require(msg.sender == owner || msg.sender == authorizedBot) — only owner or bot can create
- require(closingTime > block.timestamp) — closing time must be in the future
- require(marketType == 0 || marketType == 1) — valid market type

Action: Deploy new CricketXMarket with all parameters. Store the new market address in allMarkets array, matchMarkets[matchId] array, and isValidMarket mapping. Emit MarketCreated(marketAddress, matchId, marketType, teamA, teamB, closingTime).

#### getMarkets()

Returns allMarkets array. Frontend uses this to display all markets.

#### getMarketsByMatch(string matchId)

Returns the array of market addresses for a specific match. Typically returns 2 addresses (Match Winner + Toss Winner).

#### getUnsettledMarkets()

Returns all market addresses where isSettled == false. The bot uses this to know which markets need settlement.

#### setOracle / setTreasury / setAuthorizedBot

Owner-only functions to update addresses.

---

## 6. Deploy Scripts

Use Hardhat deployment scripts. Deploy in this order because contracts reference each other.

### Deployment Order

1. Deploy CricketXOracle with the bot wallet address as authorizedBot
2. Deploy CricketXMarketFactory with the oracle address, treasury wallet, USDC address, and bot wallet
3. Call oracle.setFactory(factoryAddress) to link oracle to factory
4. Verify all contracts on Basescan for transparency

### Environment Variables Needed

```
PRIVATE_KEY=deployer wallet private key
BOT_PRIVATE_KEY=oracle bot wallet private key
TREASURY_ADDRESS=fee collection wallet address
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org
BASESCAN_API_KEY=for contract verification
CRICAPI_KEY=CricAPI API key
```

### Test USDC

On Base Sepolia testnet, there is no official USDC. Deploy a simple MockUSDC.sol contract: a standard ERC20 with 6 decimals, a mint function anyone can call (for testing), and name = "Mock USDC", symbol = "mUSDC". Mint test USDC to your wallets before testing.

---

## 7. Unit Tests

Every function must be tested. Here is the complete test plan.

### CricketXOracle Tests

- reportResult succeeds when called by authorized bot
- reportResult reverts when called by random address
- reportResult reverts with invalid outcome (0 or 3)
- reportResult reverts for non-existent market address
- emergencySettle reverts before 48 hour timeout
- emergencySettle succeeds after 48 hour timeout
- setAuthorizedBot updates the bot address correctly
- setAuthorizedBot reverts when called by non-owner

### CricketXMarket Tests

**Order Placement:**
- placeOrder creates order with correct values
- placeOrder transfers USDC from user to contract
- placeOrder reverts if market is closed (past closingTime)
- placeOrder reverts if market is settled
- placeOrder reverts if market is paused
- placeOrder reverts if price is 0 or 100
- placeOrder reverts if amount below $0.10
- placeOrder reverts if amount above $10.00
- placeOrder reverts if user has insufficient USDC
- placeOrder reverts if user has not approved USDC spending

**Order Matching:**
- YES at 60 matches with NO at 40 automatically
- YES at 60 does NOT match with NO at 50 (60+50 != 100)
- Partial fill: YES $10 at 60 matches with NO $4 at 40 correctly
- Multiple partial fills on single order work correctly
- MatchedPair created with correct yesAmount and noAmount
- Both orders' matchedAmount and unmatchedAmount update correctly
- Order becomes inactive (isActive=false) when fully matched

**Cancellation:**
- cancelOrder refunds unmatched USDC to user
- cancelOrder only refunds unmatched portion (not matched)
- cancelOrder reverts if called by non-owner of order
- cancelOrder reverts if nothing to cancel (unmatchedAmount=0)
- cancelOrder works after closingTime (users can always cancel unmatched)
- cancelOrder works after settlement

**Settlement:**
- settle sets isSettled=true and stores outcome
- settle reverts when called by non-oracle
- settle reverts if already settled
- settle emits MarketSettled event

**Claims:**
- claimWinnings sends correct USDC to YES winner when YES wins
- claimWinnings sends correct USDC to NO winner when NO wins
- claimWinnings deducts exactly 2% fee
- claimWinnings handles user with multiple matched pairs at different prices
- claimWinnings reverts if called before settlement
- claimWinnings reverts if called twice
- claimWinnings returns 0 for losing side user
- refundUnmatched returns correct USDC for unmatched orders
- refundUnmatched reverts if called twice

### Integration Tests

- Full flow: create market via factory, place YES order, place NO order, match, settle, claim — end to end
- Full flow with partial fills: 3 users, multiple orders, different prices
- Factory creates 2 markets for same match (Match Winner + Toss Winner)
- Oracle settles Toss Winner market early while Match Winner stays open
- Bot creates market, bot settles market — simulated cron flow

---

## 8. Oracle Bot (Node.js)

A single Node.js application running 3 scheduled tasks. It creates markets in the morning and settles them when matches end. This is the bridge between CricAPI (off-chain cricket data) and the smart contracts (on-chain).

### Dependencies

- ethers.js — interact with smart contracts on Base
- node-cron — schedule recurring tasks
- node-fetch or axios — call CricAPI endpoints
- dotenv — environment variable management

### Bot Wallet

The bot needs its own Ethereum wallet funded with a small amount of ETH on Base for gas. Approximately $1-2 of ETH will last months because Base gas costs are under $0.001 per transaction. Store the private key in .env file. NEVER commit this to git.

### CricAPI Service Layer

Create a cricapi.ts module with these functions:

| Function | CricAPI Endpoint | Returns |
|----------|-----------------|---------|
| searchIPLSeries() | /v1/series?search=IPL | Series ID for current IPL season |
| getTodaysMatches(seriesId) | /v1/series_info?id={seriesId} | All matches, filter for today's date |
| getCurrentMatches() | /v1/currentMatches | Live matches with toss info |
| getMatchResult(matchId) | /v1/match_info?id={matchId} | Match result with matchWinner and tossWinner |

### Cron Job 1: Create Markets (8:00 AM IST Daily)

Runs once every morning. Checks CricAPI for today's IPL matches and creates prediction markets for each.

Logic:

1. Call getTodaysMatches() to get matches scheduled for today
2. For each match, check if markets already exist (call factory.getMarketsByMatch(matchId) — if result is non-empty, skip)
3. For each new match, call factory.createMarket() TWICE: once with marketType = MATCH_WINNER and closingTime = match start time. Once with marketType = TOSS_WINNER and closingTime = match start time.
4. Log which markets were created
5. Post to Farcaster

The closingTime for both markets is the match start time (dateTimeGMT from CricAPI). Users can place orders until the match starts. After that, no new orders but existing orders can still be cancelled.

### Cron Job 2: Settle Toss Markets (Every 2 min after match start)

Toss happens in the first 5 minutes of a match. This cron checks for toss results and settles the Toss Winner market.

Logic:

1. Call factory.getUnsettledMarkets() and filter for TOSS_WINNER type
2. For each unsettled toss market, get the matchId
3. Call getMatchResult(matchId) from CricAPI
4. If the response contains tossWinner field, determine the outcome: if tossWinner == teamA then outcome = 1 (YES wins), if tossWinner == teamB then outcome = 2 (NO wins)
5. Call oracle.reportResult(marketAddress, outcome)
6. Record this market as settled in local tracking (to avoid duplicate gas spend)
7. Post result to Farcaster

### Cron Job 3: Settle Match Winner Markets (Every 5 min after ~10 PM IST)

IPL matches typically end around 10:30-11:00 PM IST. This cron checks for match results.

Logic:

1. Call factory.getUnsettledMarkets() and filter for MATCH_WINNER type
2. For each unsettled match market, get the matchId
3. Call getMatchResult(matchId) from CricAPI
4. If the response contains matchWinner field, determine the outcome: if matchWinner == teamA then outcome = 1 (YES wins), if matchWinner == teamB then outcome = 2 (NO wins)
5. Wait 2 minutes (settlement delay buffer for data accuracy)
6. Call oracle.reportResult(marketAddress, outcome)
7. Record this market as settled in local tracking
8. Post result to Farcaster

### Local Settlement Tracking

Keep a local JSON file or in-memory Set of settled market addresses. Before calling oracle.reportResult(), check if the market is already in this set. This prevents wasting gas on transactions that will revert. The set persists across bot restarts via a simple JSON file.

### Error Handling

- If CricAPI returns error or rate limit, retry in 5 minutes
- If smart contract transaction fails, log the error and retry next cycle
- If bot crashes, cron restarts it automatically (use PM2 or systemd)
- If CricAPI is down for extended period, markets will not settle until it comes back — the 48hr emergency settle is the fallback

---

## 9. Farcaster AI Agent

The social layer. Posts to Farcaster to drive distribution and engagement. Can be built into the same Node.js bot or as a separate module.

### Dependencies

- @farcaster/hub-nodejs or Neynar API — post casts to Farcaster
- Farcaster account with FID — the bot's identity

### Auto-Posts

| Trigger | Post Content | When |
|---------|-------------|------|
| Market created | "CSK vs MI today! Match Winner and Toss Winner markets are LIVE on CricketX. Predict now: [link]" | After Cron Job 1 |
| Toss result | "TOSS: CSK won the toss and chose to bat! Toss market settled. Winners claim now." | After Cron Job 2 |
| Match result | "MATCH RESULT: MI beat CSK by 5 wickets! Market settled. Check your winnings: [link]" | After Cron Job 3 |
| Daily leaderboard | "Today's top predictors: 1. 0xAb..12 (5 wins) 2. 0xCd..34 (4 wins). Season standings: [link]" | End of day |
| Volume milestone | "$1,000 in predictions on today's CSK vs MI match! Join the action: [link]" | When volume crosses thresholds |

### Reply Bot (V2 — Optional for Launch)

Monitor Farcaster mentions of @CricketX. When someone asks "what are the odds for CSK vs MI?" the bot reads the on-chain order book and replies with current best prices. Nice-to-have for V2, not required for launch.

---

## 10. Frontend Integration

After smart contracts are deployed to testnet, connect the Lovable frontend to real on-chain data.

### What Changes

| Current (Mock) | After Integration (Real) |
|---------------|-------------------------|
| Mock wallet connect | Real Coinbase Smart Wallet via wagmi/viem |
| Mock USDC balance | Read real USDC balance from contract |
| Mock order book | Read from contract events (OrderPlaced, OrderMatched) |
| Mock place order button | Real USDC approve() then placeOrder() transaction |
| Mock cancel button | Real cancelOrder() transaction |
| Mock claim button | Real claimWinnings() transaction |
| Mock market list | Read from factory.getMarkets() |
| Mock leaderboard | Calculate from on-chain settlement events |

### Libraries Needed

- wagmi — React hooks for Ethereum
- viem — TypeScript Ethereum client
- @coinbase/onchainkit — Coinbase Smart Wallet integration
- Contract ABIs — generated by Hardhat compilation

### Key User Flows

**Flow 1 — Connect Wallet:** User clicks Connect. Coinbase Smart Wallet popup appears. User approves. Frontend reads their address and USDC balance.

**Flow 2 — Place Order:** User selects YES/NO, sets price and amount. Frontend calls usdc.approve(marketAddress, amount). Then calls market.placeOrder(side, price, amount). Show transaction pending spinner. On success, update order book.

**Flow 3 — Cancel Order:** User clicks Cancel on their unmatched order. Frontend calls market.cancelOrder(orderId). USDC returns to wallet.

**Flow 4 — Claim Winnings:** After settlement, if user won, show Claim button. Frontend calls market.claimWinnings(). USDC appears in wallet.

---

## 11. Testing Checklist

Complete this entire checklist on Base Sepolia testnet before going to mainnet.

- [ ] 1. Deploy all 3 contracts to Base Sepolia
- [ ] 2. Deploy MockUSDC and mint test tokens
- [ ] 3. Bot creates markets for a test match
- [ ] 4. User A places YES order at price 60 for $5
- [ ] 5. User B places NO order at price 40 for $3
- [ ] 6. Orders match, MatchedPair created correctly
- [ ] 7. User A has $2 unmatched, cancels and gets refund
- [ ] 8. Bot settles toss market with outcome YES
- [ ] 9. Winner claims USDC, receives correct amount minus 2%
- [ ] 10. Loser tries to claim, gets $0
- [ ] 11. User with unmatched orders calls refundUnmatched, gets USDC back
- [ ] 12. Try placing order after market closed — should revert
- [ ] 13. Try settling already settled market — should revert
- [ ] 14. Try claiming twice — should revert
- [ ] 15. Frontend shows real order book from contract events
- [ ] 16. Frontend wallet connect works with Coinbase Smart Wallet
- [ ] 17. Frontend place order flow works end-to-end
- [ ] 18. Farcaster bot posts market creation announcement
- [ ] 19. Farcaster bot posts settlement result
- [ ] 20. Full end-to-end: create market, bet, settle, claim — all automated

---

## 12. Mainnet Launch Checklist

- [ ] 1. All testnet tests pass
- [ ] 2. Update contract addresses to mainnet USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- [ ] 3. Deploy all 3 contracts to Base Mainnet
- [ ] 4. Verify all contracts on Basescan
- [ ] 5. Fund bot wallet with $2 ETH on Base for gas
- [ ] 6. Update frontend to point to mainnet contract addresses
- [ ] 7. Update bot config to use mainnet RPC and contract addresses
- [ ] 8. Set up bot hosting (Railway / Render / VPS) with PM2 for auto-restart
- [ ] 9. Set treasury address to your secure wallet
- [ ] 10. Create first real market for upcoming IPL match
- [ ] 11. Place first real bet yourself to test with real USDC
- [ ] 12. Announce on Twitter, Farcaster, and crypto communities

---

**END OF DOCUMENT**

This document is the complete build specification for CricketX. Feed it to Claude Code CLI along with the Product Context Document. Every function, every edge case, every validation is documented. No guesswork needed.
