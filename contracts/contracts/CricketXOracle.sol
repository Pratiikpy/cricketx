// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICricketXMarket.sol";
import "./interfaces/ICricketXMarketFactory.sol";

contract CricketXOracle is Ownable {
    address public authorizedBot;
    address public factory;

    event ResultReported(address indexed marketAddress, uint8 outcome, uint256 timestamp);
    event AuthorizedBotUpdated(address indexed oldBot, address indexed newBot);
    event FactoryUpdated(address indexed factory);

    constructor(address _authorizedBot) Ownable(msg.sender) {
        require(_authorizedBot != address(0), "Invalid bot address");
        authorizedBot = _authorizedBot;
    }

    function reportResult(address marketAddress, uint8 outcome) external {
        require(msg.sender == authorizedBot, "Not authorized bot");
        require(outcome == 1 || outcome == 2, "Invalid outcome");
        require(factory != address(0), "Factory not set");
        require(
            ICricketXMarketFactory(factory).isValidMarket(marketAddress),
            "Not a valid market"
        );

        ICricketXMarket(marketAddress).settle(outcome);
        emit ResultReported(marketAddress, outcome, block.timestamp);
    }

    function emergencySettle(address marketAddress, uint8 outcome) external onlyOwner {
        require(outcome == 1 || outcome == 2, "Invalid outcome");
        require(factory != address(0), "Factory not set");
        require(
            ICricketXMarketFactory(factory).isValidMarket(marketAddress),
            "Not a valid market"
        );

        uint256 closingTime = ICricketXMarket(marketAddress).closingTime();
        require(block.timestamp > closingTime + 48 hours, "Too early for emergency");

        ICricketXMarket(marketAddress).settle(outcome);
        emit ResultReported(marketAddress, outcome, block.timestamp);
    }

    function setAuthorizedBot(address _newBot) external onlyOwner {
        require(_newBot != address(0), "Invalid address");
        emit AuthorizedBotUpdated(authorizedBot, _newBot);
        authorizedBot = _newBot;
    }

    function setFactory(address _factory) external onlyOwner {
        require(_factory != address(0), "Invalid address");
        factory = _factory;
        emit FactoryUpdated(_factory);
    }
}
