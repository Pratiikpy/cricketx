// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CricketXMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Enums ---
    enum MarketType { MATCH_WINNER, TOSS_WINNER }

    // --- Structs ---
    struct Order {
        address user;
        uint8 side;           // 1 = YES, 2 = NO
        uint256 price;        // 1-99 (cents)
        uint256 totalAmount;  // total USDC deposited
        uint256 matchedAmount;
        uint256 unmatchedAmount;
        bool isActive;
        uint256 timestamp;
    }

    struct MatchedPair {
        address yesUser;
        address noUser;
        uint256 yesPrice;
        uint256 noPrice;
        uint256 yesAmount;
        uint256 noAmount;
        uint256 amount;       // yesAmount + noAmount
    }

    // --- Constants ---
    uint256 public constant FEE_BPS = 200;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_BET = 100000;       // $0.10 (6 decimals)
    uint256 public constant MAX_BET = 10000000;     // $10.00
    uint256 public constant MAX_MATCH_ITERATIONS = 50;
    uint256 public constant PRICE_SUM = 100;

    // --- State ---
    address public oracle;
    address public treasury;
    IERC20 public usdc;
    string public matchId;
    MarketType public marketType;
    string public teamA;
    string public teamB;
    uint256 public closingTime;
    bool public isSettled;
    uint8 public outcome;     // 0 = unsettled, 1 = YES wins, 2 = NO wins
    bool public isPaused;
    uint256 public totalFees;
    uint256 public settlementTime;
    address public owner;

    Order[] public orders;
    MatchedPair[] public matchedPairs;
    mapping(address => uint256[]) private _userOrderIndices;
    mapping(address => bool) public hasClaimed;
    mapping(address => bool) public hasRefunded;

    // --- Events ---
    event OrderPlaced(uint256 indexed orderId, address indexed user, uint8 side, uint256 price, uint256 amount, uint256 matchedAmount);
    event OrderMatched(uint256 indexed matchedPairId, address yesUser, address noUser, uint256 yesPrice, uint256 amount);
    event OrderCancelled(uint256 indexed orderId, address indexed user, uint256 refundedAmount);
    event MarketSettled(string matchId, MarketType marketType, uint8 outcome, uint256 timestamp);
    event WinningsClaimed(address indexed user, uint256 payout, uint256 fee);
    event UnmatchedRefunded(address indexed user, uint256 amount);

    // --- Constructor ---
    constructor(
        address _oracle,
        address _treasury,
        address _usdc,
        string memory _matchId,
        MarketType _marketType,
        string memory _teamA,
        string memory _teamB,
        uint256 _closingTime
    ) {
        require(_oracle != address(0) && _treasury != address(0) && _usdc != address(0), "Zero address");
        require(_closingTime > block.timestamp, "Invalid closing time");

        oracle = _oracle;
        treasury = _treasury;
        usdc = IERC20(_usdc);
        matchId = _matchId;
        marketType = _marketType;
        teamA = _teamA;
        teamB = _teamB;
        closingTime = _closingTime;
        owner = msg.sender;
    }

    // --- Core: Place Order ---
    function placeOrder(uint8 side, uint256 price, uint256 amount) external nonReentrant {
        require(!isPaused, "Market paused");
        require(!isSettled, "Market settled");
        require(block.timestamp < closingTime, "Market closed");
        require(side == 1 || side == 2, "Invalid side");
        require(price >= 1 && price <= 99, "Invalid price");
        require(amount >= MIN_BET, "Below min bet");
        require(amount <= MAX_BET, "Above max bet");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        uint256 orderId = orders.length;
        orders.push(Order({
            user: msg.sender,
            side: side,
            price: price,
            totalAmount: amount,
            matchedAmount: 0,
            unmatchedAmount: amount,
            isActive: true,
            timestamp: block.timestamp
        }));
        _userOrderIndices[msg.sender].push(orderId);

        uint256 totalMatched = _matchOrder(orderId);

        emit OrderPlaced(orderId, msg.sender, side, price, amount, totalMatched);
    }

    // --- Core: Matching Algorithm ---
    function _matchOrder(uint256 newOrderId) internal returns (uint256 totalMatched) {
        Order storage newOrder = orders[newOrderId];
        uint8 oppositeSide = newOrder.side == 1 ? uint8(2) : uint8(1);
        uint256 iterations = 0;

        for (uint256 i = 0; i < orders.length && iterations < MAX_MATCH_ITERATIONS; i++) {
            if (newOrder.unmatchedAmount == 0) break;
            if (i == newOrderId) continue;

            Order storage oppOrder = orders[i];
            if (!oppOrder.isActive) continue;
            if (oppOrder.side != oppositeSide) continue;
            if (newOrder.price + oppOrder.price != PRICE_SUM) continue;

            iterations++;

            uint256 consumed = _executeMatch(newOrderId, i);
            if (consumed == 0) continue;

            totalMatched += consumed;
        }

        if (newOrder.unmatchedAmount == 0) {
            newOrder.isActive = false;
        }
    }

    function _executeMatch(uint256 newOrderId, uint256 oppOrderId) internal returns (uint256 newConsumed) {
        Order storage newOrder = orders[newOrderId];
        Order storage oppOrder = orders[oppOrderId];

        // Calculate matchable shares
        uint256 newShares = newOrder.unmatchedAmount / newOrder.price;
        uint256 oppShares = oppOrder.unmatchedAmount / oppOrder.price;
        uint256 matchableShares = newShares < oppShares ? newShares : oppShares;

        if (matchableShares == 0) return 0;

        newConsumed = matchableShares * newOrder.price;
        uint256 oppConsumed = matchableShares * oppOrder.price;

        // Build MatchedPair based on which side is YES
        MatchedPair memory pair;
        if (newOrder.side == 1) {
            pair = MatchedPair({
                yesUser: newOrder.user,
                noUser: oppOrder.user,
                yesPrice: newOrder.price,
                noPrice: oppOrder.price,
                yesAmount: newConsumed,
                noAmount: oppConsumed,
                amount: newConsumed + oppConsumed
            });
        } else {
            pair = MatchedPair({
                yesUser: oppOrder.user,
                noUser: newOrder.user,
                yesPrice: oppOrder.price,
                noPrice: newOrder.price,
                yesAmount: oppConsumed,
                noAmount: newConsumed,
                amount: newConsumed + oppConsumed
            });
        }

        uint256 pairId = matchedPairs.length;
        matchedPairs.push(pair);

        // Update orders
        newOrder.matchedAmount += newConsumed;
        newOrder.unmatchedAmount -= newConsumed;
        oppOrder.matchedAmount += oppConsumed;
        oppOrder.unmatchedAmount -= oppConsumed;

        if (oppOrder.unmatchedAmount == 0) {
            oppOrder.isActive = false;
        }

        emit OrderMatched(pairId, pair.yesUser, pair.noUser, pair.yesPrice, pair.amount);
    }

    // --- Cancel Order ---
    function cancelOrder(uint256 orderId) external nonReentrant {
        require(orderId < orders.length, "Invalid order");
        Order storage order = orders[orderId];
        require(order.user == msg.sender, "Not order owner");
        require(order.unmatchedAmount > 0, "Nothing to cancel");

        uint256 refundAmount = order.unmatchedAmount;
        order.unmatchedAmount = 0;
        if (order.matchedAmount == 0) {
            order.isActive = false;
        }

        usdc.safeTransfer(msg.sender, refundAmount);
        emit OrderCancelled(orderId, msg.sender, refundAmount);
    }

    // --- Settlement ---
    function settle(uint8 _outcome) external {
        require(msg.sender == oracle, "Not oracle");
        require(!isSettled, "Already settled");
        require(_outcome == 1 || _outcome == 2, "Invalid outcome");

        isSettled = true;
        outcome = _outcome;
        settlementTime = block.timestamp;

        emit MarketSettled(matchId, marketType, _outcome, block.timestamp);
    }

    function correctSettlement(uint8 _newOutcome) external {
        require(msg.sender == oracle, "Not oracle");
        require(isSettled, "Not settled");
        require(_newOutcome == 1 || _newOutcome == 2, "Invalid outcome");
        require(block.timestamp <= settlementTime + 10 minutes, "Correction window closed");

        outcome = _newOutcome;
        emit MarketSettled(matchId, marketType, _newOutcome, block.timestamp);
    }

    // --- Claim Winnings ---
    function claimWinnings() external nonReentrant {
        require(isSettled, "Not settled");
        require(!hasClaimed[msg.sender], "Already claimed");

        uint256 totalPayout = _calculatePayout(msg.sender);
        require(totalPayout > 0, "No winnings");

        hasClaimed[msg.sender] = true;

        uint256 fee = (totalPayout * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netPayout = totalPayout - fee;
        totalFees += fee;

        usdc.safeTransfer(msg.sender, netPayout);
        emit WinningsClaimed(msg.sender, netPayout, fee);
    }

    // --- Refund Unmatched ---
    function refundUnmatched() external nonReentrant {
        require(isSettled, "Not settled");
        require(!hasRefunded[msg.sender], "Already refunded");

        uint256 totalRefund = _calculateRefund(msg.sender);
        require(totalRefund > 0, "Nothing to refund");

        hasRefunded[msg.sender] = true;
        usdc.safeTransfer(msg.sender, totalRefund);
        emit UnmatchedRefunded(msg.sender, totalRefund);
    }

    // --- Claim All (convenience: winnings + refund in one tx) ---
    function claimAll() external nonReentrant {
        require(isSettled, "Not settled");

        uint256 totalPayout = 0;
        uint256 totalRefund = 0;

        if (!hasClaimed[msg.sender]) {
            totalPayout = _calculatePayout(msg.sender);
            if (totalPayout > 0) {
                hasClaimed[msg.sender] = true;
                uint256 fee = (totalPayout * FEE_BPS) / BPS_DENOMINATOR;
                totalFees += fee;
                totalPayout -= fee;
            }
        }

        if (!hasRefunded[msg.sender]) {
            totalRefund = _calculateRefund(msg.sender);
            if (totalRefund > 0) {
                hasRefunded[msg.sender] = true;
            }
        }

        uint256 total = totalPayout + totalRefund;
        require(total > 0, "Nothing to claim");

        usdc.safeTransfer(msg.sender, total);

        if (totalPayout > 0) {
            emit WinningsClaimed(msg.sender, totalPayout, (totalPayout * FEE_BPS) / BPS_DENOMINATOR);
        }
        if (totalRefund > 0) {
            emit UnmatchedRefunded(msg.sender, totalRefund);
        }
    }

    // --- Admin ---
    function withdrawFees() external {
        require(msg.sender == owner || msg.sender == treasury, "Not authorized");
        uint256 amount = totalFees;
        require(amount > 0, "No fees");
        totalFees = 0;
        usdc.safeTransfer(treasury, amount);
    }

    function sweepDust() external {
        require(msg.sender == owner, "Not owner");
        require(isSettled, "Not settled");
        require(block.timestamp > settlementTime + 30 days, "Too early");
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            usdc.safeTransfer(treasury, balance);
        }
    }

    function emergencyPause() external {
        require(msg.sender == owner, "Not owner");
        isPaused = true;
    }

    function emergencyUnpause() external {
        require(msg.sender == owner, "Not owner");
        isPaused = false;
    }

    // --- Internal Helpers ---
    function _calculatePayout(address user) internal view returns (uint256 totalPayout) {
        for (uint256 i = 0; i < matchedPairs.length; i++) {
            MatchedPair storage pair = matchedPairs[i];
            if (outcome == 1 && pair.yesUser == user) {
                totalPayout += pair.amount;
            } else if (outcome == 2 && pair.noUser == user) {
                totalPayout += pair.amount;
            }
        }
    }

    function _calculateRefund(address user) internal returns (uint256 totalRefund) {
        uint256[] storage indices = _userOrderIndices[user];
        for (uint256 i = 0; i < indices.length; i++) {
            Order storage order = orders[indices[i]];
            if (order.unmatchedAmount > 0) {
                totalRefund += order.unmatchedAmount;
                order.unmatchedAmount = 0;
            }
        }
    }

    // --- View Functions ---
    function getOrderBook() external view returns (Order[] memory yesOrders, Order[] memory noOrders) {
        uint256 yesCount = 0;
        uint256 noCount = 0;
        for (uint256 i = 0; i < orders.length; i++) {
            if (!orders[i].isActive) continue;
            if (orders[i].side == 1) yesCount++;
            else noCount++;
        }
        yesOrders = new Order[](yesCount);
        noOrders = new Order[](noCount);
        uint256 yi = 0;
        uint256 ni = 0;
        for (uint256 i = 0; i < orders.length; i++) {
            if (!orders[i].isActive) continue;
            if (orders[i].side == 1) yesOrders[yi++] = orders[i];
            else noOrders[ni++] = orders[i];
        }
    }

    function getUserOrders(address user) external view returns (Order[] memory) {
        uint256[] storage indices = _userOrderIndices[user];
        Order[] memory result = new Order[](indices.length);
        for (uint256 i = 0; i < indices.length; i++) {
            result[i] = orders[indices[i]];
        }
        return result;
    }

    function getUserOrderIds(address user) external view returns (uint256[] memory) {
        return _userOrderIndices[user];
    }

    function getUserPayout(address user) external view returns (uint256) {
        if (!isSettled) return 0;
        uint256 totalPayout = _calculatePayoutView(user);
        if (totalPayout > 0) {
            uint256 fee = (totalPayout * FEE_BPS) / BPS_DENOMINATOR;
            totalPayout -= fee;
        }
        return totalPayout;
    }

    function _calculatePayoutView(address user) internal view returns (uint256 totalPayout) {
        for (uint256 i = 0; i < matchedPairs.length; i++) {
            MatchedPair storage pair = matchedPairs[i];
            if (outcome == 1 && pair.yesUser == user) {
                totalPayout += pair.amount;
            } else if (outcome == 2 && pair.noUser == user) {
                totalPayout += pair.amount;
            }
        }
    }

    function getMarketInfo() external view returns (
        string memory _matchId,
        MarketType _marketType,
        string memory _teamA,
        string memory _teamB,
        uint256 _closingTime,
        bool _isSettled,
        uint8 _outcome
    ) {
        return (matchId, marketType, teamA, teamB, closingTime, isSettled, outcome);
    }

    function getTotalVolume() external view returns (uint256 vol) {
        for (uint256 i = 0; i < matchedPairs.length; i++) {
            vol += matchedPairs[i].amount;
        }
    }

    function getMatchedPairsCount() external view returns (uint256) {
        return matchedPairs.length;
    }

    function getOrdersCount() external view returns (uint256) {
        return orders.length;
    }

    function getMatchedPairs() external view returns (MatchedPair[] memory) {
        return matchedPairs;
    }
}
