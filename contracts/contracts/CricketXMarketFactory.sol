// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CricketXMarket.sol";

contract CricketXMarketFactory is Ownable {
    address public oracle;
    address public treasury;
    address public usdc;
    address public authorizedBot;

    address[] public allMarkets;
    mapping(string => address[]) private _matchMarkets;
    mapping(address => bool) public isValidMarket;

    event MarketCreated(
        address indexed marketAddress,
        string matchId,
        CricketXMarket.MarketType marketType,
        string teamA,
        string teamB,
        uint256 closingTime
    );

    constructor(
        address _oracle,
        address _treasury,
        address _usdc,
        address _authorizedBot
    ) Ownable(msg.sender) {
        require(_oracle != address(0), "Invalid oracle");
        require(_treasury != address(0), "Invalid treasury");
        require(_usdc != address(0), "Invalid USDC");
        require(_authorizedBot != address(0), "Invalid bot");
        oracle = _oracle;
        treasury = _treasury;
        usdc = _usdc;
        authorizedBot = _authorizedBot;
    }

    function createMarket(
        string calldata matchId,
        uint8 marketType,
        string calldata teamA,
        string calldata teamB,
        uint256 closingTime
    ) external returns (address) {
        require(
            msg.sender == owner() || msg.sender == authorizedBot,
            "Not authorized"
        );
        require(closingTime > block.timestamp, "Invalid closing time");
        require(marketType <= 1, "Invalid market type");

        CricketXMarket market = new CricketXMarket(
            oracle,
            treasury,
            usdc,
            matchId,
            CricketXMarket.MarketType(marketType),
            teamA,
            teamB,
            closingTime
        );

        address marketAddr = address(market);
        allMarkets.push(marketAddr);
        _matchMarkets[matchId].push(marketAddr);
        isValidMarket[marketAddr] = true;

        emit MarketCreated(
            marketAddr,
            matchId,
            CricketXMarket.MarketType(marketType),
            teamA,
            teamB,
            closingTime
        );

        return marketAddr;
    }

    function getMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    function getMarketsByMatch(string calldata matchId) external view returns (address[] memory) {
        return _matchMarkets[matchId];
    }

    function getMarketsCount() external view returns (uint256) {
        return allMarkets.length;
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid address");
        oracle = _oracle;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }

    function setAuthorizedBot(address _bot) external onlyOwner {
        require(_bot != address(0), "Invalid address");
        authorizedBot = _bot;
    }
}
