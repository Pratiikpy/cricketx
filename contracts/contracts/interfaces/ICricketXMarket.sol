// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICricketXMarket {
    function settle(uint8 outcome) external;
    function closingTime() external view returns (uint256);
    function isSettled() external view returns (bool);
}
