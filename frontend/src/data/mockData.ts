export interface Team {
  name: string;
  short: string;
  color: string;
}

export const teams: Record<string, Team> = {
  CSK: { name: "Chennai Super Kings", short: "CSK", color: "#FFDC00" },
  MI: { name: "Mumbai Indians", short: "MI", color: "#004BA0" },
  RCB: { name: "Royal Challengers Bengaluru", short: "RCB", color: "#EC1C24" },
  KKR: { name: "Kolkata Knight Riders", short: "KKR", color: "#3A225D" },
  SRH: { name: "Sunrisers Hyderabad", short: "SRH", color: "#FF822A" },
  DC: { name: "Delhi Capitals", short: "DC", color: "#004C93" },
  PBKS: { name: "Punjab Kings", short: "PBKS", color: "#DD1F2D" },
  RR: { name: "Rajasthan Royals", short: "RR", color: "#EA1A85" },
  GT: { name: "Gujarat Titans", short: "GT", color: "#1C1C2B" },
  LSG: { name: "Lucknow Super Giants", short: "LSG", color: "#A72056" },
};

export type MatchStatus = "live" | "upcoming" | "settled";

export interface OrderBookEntry {
  price: number;
  amount: number;
}

export interface Market {
  id: string;
  type: "match_winner" | "toss_winner";
  label: string;
  yesLabel: string;
  noLabel: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  orders: number;
  result?: "yes" | "no";
  orderBook: {
    yes: OrderBookEntry[];
    no: OrderBookEntry[];
  };
}

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  venue: string;
  status: MatchStatus;
  markets: Market[];
}

export interface UserBet {
  id: string;
  matchId: string;
  matchLabel: string;
  marketType: string;
  side: "yes" | "no";
  sideLabel: string;
  price: number;
  amount: number;
  status: "pending" | "matched" | "won" | "lost";
  payout?: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  bets: number;
  winRate: number;
  netProfit: number;
  streak: number;
}

function generateOrderBook(): { yes: OrderBookEntry[]; no: OrderBookEntry[] } {
  const yesOrders: OrderBookEntry[] = [];
  const noOrders: OrderBookEntry[] = [];
  const baseYes = 0.55 + Math.random() * 0.15;
  for (let i = 0; i < 6; i++) {
    yesOrders.push({
      price: Math.round((baseYes - i * 0.03) * 100) / 100,
      amount: Math.round((10 + Math.random() * 80) * 100) / 100,
    });
    noOrders.push({
      price: Math.round((1 - baseYes + i * 0.03) * 100) / 100,
      amount: Math.round((10 + Math.random() * 80) * 100) / 100,
    });
  }
  return { yes: yesOrders, no: noOrders };
}

export const matches: Match[] = [
  {
    id: "match-1",
    teamA: "RCB",
    teamB: "CSK",
    date: "Mar 28, 2026",
    time: "7:30 PM IST",
    venue: "M. Chinnaswamy Stadium, Bengaluru",
    status: "live",
    markets: [
      {
        id: "m1-winner",
        type: "match_winner",
        label: "Match Winner",
        yesLabel: "RCB",
        noLabel: "CSK",
        yesPrice: 0.62,
        noPrice: 0.38,
        volume: 2340,
        orders: 47,
        orderBook: generateOrderBook(),
      },
      {
        id: "m1-toss",
        type: "toss_winner",
        label: "Toss Winner",
        yesLabel: "RCB",
        noLabel: "CSK",
        yesPrice: 0.50,
        noPrice: 0.50,
        volume: 890,
        orders: 23,
        result: "yes",
        orderBook: generateOrderBook(),
      },
    ],
  },
  {
    id: "match-2",
    teamA: "MI",
    teamB: "KKR",
    date: "Mar 29, 2026",
    time: "3:30 PM IST",
    venue: "Wankhede Stadium, Mumbai",
    status: "live",
    markets: [
      {
        id: "m2-winner",
        type: "match_winner",
        label: "Match Winner",
        yesLabel: "MI",
        noLabel: "KKR",
        yesPrice: 0.55,
        noPrice: 0.45,
        volume: 4120,
        orders: 63,
        orderBook: generateOrderBook(),
      },
      {
        id: "m2-toss",
        type: "toss_winner",
        label: "Toss Winner",
        yesLabel: "MI",
        noLabel: "KKR",
        yesPrice: 0.48,
        noPrice: 0.52,
        volume: 1230,
        orders: 31,
        orderBook: generateOrderBook(),
      },
    ],
  },
  {
    id: "match-3",
    teamA: "SRH",
    teamB: "DC",
    date: "Mar 30, 2026",
    time: "7:30 PM IST",
    venue: "Rajiv Gandhi Intl Stadium, Hyderabad",
    status: "upcoming",
    markets: [
      {
        id: "m3-winner",
        type: "match_winner",
        label: "Match Winner",
        yesLabel: "SRH",
        noLabel: "DC",
        yesPrice: 0.58,
        noPrice: 0.42,
        volume: 1560,
        orders: 34,
        orderBook: generateOrderBook(),
      },
      {
        id: "m3-toss",
        type: "toss_winner",
        label: "Toss Winner",
        yesLabel: "SRH",
        noLabel: "DC",
        yesPrice: 0.51,
        noPrice: 0.49,
        volume: 670,
        orders: 18,
        orderBook: generateOrderBook(),
      },
    ],
  },
  {
    id: "match-4",
    teamA: "GT",
    teamB: "RR",
    date: "Mar 31, 2026",
    time: "7:30 PM IST",
    venue: "Narendra Modi Stadium, Ahmedabad",
    status: "upcoming",
    markets: [
      {
        id: "m4-winner",
        type: "match_winner",
        label: "Match Winner",
        yesLabel: "GT",
        noLabel: "RR",
        yesPrice: 0.52,
        noPrice: 0.48,
        volume: 980,
        orders: 22,
        orderBook: generateOrderBook(),
      },
      {
        id: "m4-toss",
        type: "toss_winner",
        label: "Toss Winner",
        yesLabel: "GT",
        noLabel: "RR",
        yesPrice: 0.50,
        noPrice: 0.50,
        volume: 340,
        orders: 12,
        orderBook: generateOrderBook(),
      },
    ],
  },
  {
    id: "match-5",
    teamA: "PBKS",
    teamB: "LSG",
    date: "Mar 25, 2026",
    time: "7:30 PM IST",
    venue: "IS Bindra Stadium, Mohali",
    status: "settled",
    markets: [
      {
        id: "m5-winner",
        type: "match_winner",
        label: "Match Winner",
        yesLabel: "PBKS",
        noLabel: "LSG",
        yesPrice: 0.65,
        noPrice: 0.35,
        volume: 5670,
        orders: 89,
        result: "yes",
        orderBook: generateOrderBook(),
      },
      {
        id: "m5-toss",
        type: "toss_winner",
        label: "Toss Winner",
        yesLabel: "PBKS",
        noLabel: "LSG",
        yesPrice: 0.50,
        noPrice: 0.50,
        volume: 1890,
        orders: 45,
        result: "no",
        orderBook: generateOrderBook(),
      },
    ],
  },
  {
    id: "match-6",
    teamA: "CSK",
    teamB: "DC",
    date: "Mar 24, 2026",
    time: "3:30 PM IST",
    venue: "MA Chidambaram Stadium, Chennai",
    status: "settled",
    markets: [
      {
        id: "m6-winner",
        type: "match_winner",
        label: "Match Winner",
        yesLabel: "CSK",
        noLabel: "DC",
        yesPrice: 0.72,
        noPrice: 0.28,
        volume: 8230,
        orders: 124,
        result: "yes",
        orderBook: generateOrderBook(),
      },
      {
        id: "m6-toss",
        type: "toss_winner",
        label: "Toss Winner",
        yesLabel: "CSK",
        noLabel: "DC",
        yesPrice: 0.50,
        noPrice: 0.50,
        volume: 2340,
        orders: 56,
        result: "yes",
        orderBook: generateOrderBook(),
      },
    ],
  },
];

export const userBets: UserBet[] = [
  { id: "b1", matchId: "match-1", matchLabel: "RCB vs CSK", marketType: "Match Winner", side: "yes", sideLabel: "RCB", price: 0.60, amount: 5.00, status: "matched", payout: 8.17 },
  { id: "b2", matchId: "match-2", matchLabel: "MI vs KKR", marketType: "Match Winner", side: "no", sideLabel: "KKR", price: 0.45, amount: 3.00, status: "pending" },
  { id: "b3", matchId: "match-5", matchLabel: "PBKS vs LSG", marketType: "Match Winner", side: "yes", sideLabel: "PBKS", price: 0.55, amount: 10.00, status: "won", payout: 17.82 },
  { id: "b4", matchId: "match-6", matchLabel: "CSK vs DC", marketType: "Toss Winner", side: "no", sideLabel: "DC", price: 0.48, amount: 2.00, status: "lost" },
  { id: "b5", matchId: "match-3", matchLabel: "SRH vs DC", marketType: "Match Winner", side: "yes", sideLabel: "SRH", price: 0.58, amount: 4.00, status: "pending" },
  { id: "b6", matchId: "match-1", matchLabel: "RCB vs CSK", marketType: "Toss Winner", side: "yes", sideLabel: "RCB", price: 0.50, amount: 1.50, status: "won", payout: 2.94 },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, address: "0xAb5...cD12", bets: 47, winRate: 68, netProfit: 234.50, streak: 5 },
  { rank: 2, address: "0xEf3...gH34", bets: 38, winRate: 62, netProfit: 187.20, streak: 3 },
  { rank: 3, address: "0x12a...bC56", bets: 52, winRate: 58, netProfit: 156.80, streak: 2 },
  { rank: 4, address: "0x9fD...eA78", bets: 29, winRate: 72, netProfit: 143.30, streak: 7 },
  { rank: 5, address: "0x3Bc...dF90", bets: 61, winRate: 54, netProfit: 128.60, streak: 1 },
  { rank: 6, address: "0x7eA...cB23", bets: 33, winRate: 64, netProfit: 112.40, streak: 4 },
  { rank: 7, address: "0x5dC...aE45", bets: 44, winRate: 57, netProfit: 98.70, streak: 2 },
  { rank: 8, address: "0x8fB...gD67", bets: 27, winRate: 67, netProfit: 87.50, streak: 3 },
  { rank: 9, address: "0x2aE...hC89", bets: 56, winRate: 52, netProfit: 76.30, streak: 1 },
  { rank: 10, address: "0x6dA...iF01", bets: 35, winRate: 60, netProfit: 64.80, streak: 2 },
  { rank: 11, address: "0x4cB...jA23", bets: 41, winRate: 56, netProfit: 53.40, streak: 1 },
  { rank: 12, address: "0x1eD...kB45", bets: 22, winRate: 68, netProfit: 45.20, streak: 4 },
  { rank: 13, address: "0x9aF...lC67", bets: 48, winRate: 50, netProfit: 38.90, streak: 0 },
  { rank: 14, address: "0x3bA...mD89", bets: 31, winRate: 55, netProfit: 27.60, streak: 2 },
  { rank: 15, address: "0x7cE...nE01", bets: 39, winRate: 53, netProfit: 19.80, streak: 1 },
  { rank: 16, address: "0x5dB...oF23", bets: 26, winRate: 58, netProfit: 12.40, streak: 3 },
  { rank: 17, address: "0x2eC...pA45", bets: 43, winRate: 49, netProfit: 8.70, streak: 0 },
  { rank: 18, address: "0x8fA...qB67", bets: 18, winRate: 61, netProfit: 5.30, streak: 2 },
  { rank: 19, address: "0x6aD...rC89", bets: 37, winRate: 46, netProfit: -2.10, streak: 0 },
  { rank: 20, address: "0x4bE...sD01", bets: 50, winRate: 44, netProfit: -8.40, streak: 0 },
];

export const recentTrades = [
  { side: "yes" as const, price: 0.62, amount: 3.00, time: "2 min ago" },
  { side: "no" as const, price: 0.40, amount: 8.00, time: "5 min ago" },
  { side: "yes" as const, price: 0.58, amount: 5.50, time: "8 min ago" },
  { side: "no" as const, price: 0.42, amount: 2.00, time: "12 min ago" },
  { side: "yes" as const, price: 0.60, amount: 10.00, time: "15 min ago" },
  { side: "yes" as const, price: 0.55, amount: 4.00, time: "20 min ago" },
];
