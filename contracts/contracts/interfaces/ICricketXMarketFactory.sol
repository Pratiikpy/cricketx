// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICricketXMarketFactory {
    function isValidMarket(address market) external view returns (bool);
}
