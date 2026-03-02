import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Loader2, Trophy, Ban } from "lucide-react";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import OrderBookView from "@/components/OrderBookView";
import BettingPanel from "@/components/BettingPanel";
import SparklineChart from "@/components/SparklineChart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/context/WalletContext";
import { useMatchDetail } from "@/hooks/useCricketData";
import { getTeamShort, getMatchStatus } from "@/services/cricketApi";
import { useMarketsByMatch, useOnchainMarketInfo, useOnchainOrderBook, useOnchainUserOrders } from "@/hooks/useOnchainMarkets";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useCancelOrder } from "@/hooks/useCancelOrder";
import { formatUnits } from "viem";
import { matches as mockMatches, recentTrades, teams } from "@/data/mockData";

const MarketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { connected, rawAddress } = useWallet();
  const { toast } = useToast();

  // Try to load CricAPI match data
  const { data: cricMatch, isLoading: cricLoading } = useMatchDetail(id);

  // Look up on-chain markets for this match ID
  const { data: marketAddresses } = useMarketsByMatch(id);
  const matchWinnerAddr = (marketAddresses as `0x${string}`[] | undefined)?.[0];
  const tossWinnerAddr = (marketAddresses as `0x${string}`[] | undefined)?.[1];

  // Read on-chain market info (use match winner market primarily)
  const { market: onchainMarket } = useOnchainMarketInfo(matchWinnerAddr);

  // Read on-chain order book
  const { data: orderBookData } = useOnchainOrderBook(matchWinnerAddr);

  // Read user's orders
  const { data: userOrdersData } = useOnchainUserOrders(matchWinnerAddr, rawAddress);

  // Claim & cancel hooks
  const { claimAll, isLoading: isClaiming, isSuccess: claimSuccess, reset: resetClaim } = useClaimWinnings();
  const { cancelOrder, isLoading: isCancelling, isSuccess: cancelSuccess, reset: resetCancel } = useCancelOrder();

  useEffect(() => {
    if (claimSuccess) {
      toast({ title: "Winnings Claimed!", description: "USDC sent to your wallet." });
      resetClaim();
    }
  }, [claimSuccess]);

  useEffect(() => {
    if (cancelSuccess) {
      toast({ title: "Order Cancelled", description: "Unmatched USDC refunded." });
      resetCancel();
    }
  }, [cancelSuccess]);

  // Build display data from CricAPI or on-chain
  const teamA = cricMatch ? getTeamShort(cricMatch.teams?.[0] || "") : onchainMarket?.teamA || "Team A";
  const teamB = cricMatch ? getTeamShort(cricMatch.teams?.[1] || "") : onchainMarket?.teamB || "Team B";
  const status = cricMatch ? getMatchStatus(cricMatch) : onchainMarket?.isSettled ? "completed" : "live";

  // Parse on-chain order book into display format
  const parseOrderBook = () => {
    if (!orderBookData) return { yes: [], no: [] };
    const [sides, prices, amounts, actives] = orderBookData as [number[], bigint[], bigint[], boolean[]];
    const yes: { price: number; amount: number }[] = [];
    const no: { price: number; amount: number }[] = [];
    for (let i = 0; i < sides.length; i++) {
      if (!actives[i]) continue;
      const entry = {
        price: Number(prices[i]) / 100,
        amount: parseFloat(formatUnits(amounts[i], 6)),
      };
      if (Number(sides[i]) === 1) yes.push(entry);
      else no.push(entry);
    }
    // Aggregate by price level
    const aggregate = (arr: typeof yes) => {
      const map = new Map<number, number>();
      arr.forEach((e) => map.set(e.price, (map.get(e.price) || 0) + e.amount));
      return Array.from(map.entries())
        .map(([price, amount]) => ({ price, amount }))
        .sort((a, b) => b.price - a.price);
    };
    return { yes: aggregate(yes), no: aggregate(no) };
  };

  const orderBook = parseOrderBook();

  // Parse user orders
  const parseUserOrders = () => {
    if (!userOrdersData) return [];
    const [ids, sides, prices, totalAmounts, matchedAmounts, unmatchedAmounts, actives] = userOrdersData as [
      bigint[], number[], bigint[], bigint[], bigint[], bigint[], boolean[]
    ];
    return ids.map((orderId, i) => ({
      id: orderId,
      side: Number(sides[i]) === 1 ? ("yes" as const) : ("no" as const),
      price: Number(prices[i]) / 100,
      totalAmount: parseFloat(formatUnits(totalAmounts[i], 6)),
      matchedAmount: parseFloat(formatUnits(matchedAmounts[i], 6)),
      unmatchedAmount: parseFloat(formatUnits(unmatchedAmounts[i], 6)),
      isActive: actives[i],
    }));
  };

  const userOrders = parseUserOrders();
  const hasOnchainMarket = !!matchWinnerAddr;

  // Build mock Market object for BettingPanel compatibility
  const marketForPanel = {
    id: id || "",
    type: "match_winner" as const,
    label: "Match Winner",
    yesLabel: teamA,
    noLabel: teamB,
    yesPrice: orderBook.yes[0]?.price || 0.5,
    noPrice: orderBook.no[0]?.price || 0.5,
    volume: onchainMarket ? parseFloat(onchainMarket.totalVolume) : 0,
    orders: onchainMarket?.ordersCount || 0,
    orderBook: { yes: orderBook.yes, no: orderBook.no },
  };

  // Fallback to mock if no CricAPI and no on-chain data
  if (!cricMatch && !onchainMarket && !cricLoading) {
    // Try mock data
    let foundMarket = null;
    let foundMatch = null;
    for (const match of mockMatches) {
      const market = match.markets.find((m) => m.id === id);
      if (market) { foundMarket = market; foundMatch = match; break; }
    }
    if (foundMarket && foundMatch) {
      return (
        <Layout>
          <div className="container py-6">
            <div className="flex items-center gap-3 mb-6">
              <Link to="/markets" className="p-2 rounded-lg hover:bg-secondary transition-colors"><ArrowLeft size={20} /></Link>
              <div className="flex-1">
                <h1 className="text-xl font-extrabold">
                  {teams[foundMatch.teamA]?.short} vs {teams[foundMatch.teamB]?.short} — {foundMarket.label}
                </h1>
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 cricket-card p-5">
                <OrderBookView yesOrders={foundMarket.orderBook.yes} noOrders={foundMarket.orderBook.no} />
              </div>
              <div className="lg:col-span-1 lg:sticky lg:top-20">
                <BettingPanel market={foundMarket} />
              </div>
            </div>
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Market not found.</p>
          <Link to="/markets" className="text-accent underline text-sm mt-2 inline-block">Back to Markets</Link>
        </div>
      </Layout>
    );
  }

  if (cricLoading) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <Loader2 size={32} className="mx-auto animate-spin text-muted-foreground" />
          <p className="text-muted-foreground mt-3">Loading match data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/markets" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold">
              {teamA} vs {teamB} — Match Winner
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {cricMatch && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(cricMatch.dateTimeGMT).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  {" • "}
                  {new Date(cricMatch.dateTimeGMT).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {status === "live" && (
                <span className="flex items-center gap-1 text-cricket-success font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cricket-success animate-pulse" /> LIVE
                </span>
              )}
              {onchainMarket?.isSettled && (
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <Trophy size={12} /> Settled — {onchainMarket.outcome === 1 ? teamA : teamB} wins
                </span>
              )}
              {hasOnchainMarket && (
                <span className="px-2 py-0.5 rounded-full bg-cricket-success/15 text-cricket-success text-[10px] font-semibold">
                  On-chain
                </span>
              )}
            </div>
            {hasOnchainMarket && onchainMarket && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span>Volume: ${onchainMarket.totalVolume}</span>
                <span>{onchainMarket.ordersCount} orders</span>
                <span>{onchainMarket.matchedPairs} matched</span>
              </div>
            )}
          </div>
          <SparklineChart basePrice={marketForPanel.yesPrice} className="hidden sm:block" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order book + orders */}
          <div className="lg:col-span-2 space-y-6">
            <div className="cricket-card p-5">
              <OrderBookView
                yesOrders={orderBook.yes.length > 0 ? orderBook.yes : [{ price: 0.50, amount: 0 }]}
                noOrders={orderBook.no.length > 0 ? orderBook.no : [{ price: 0.50, amount: 0 }]}
              />
              {!hasOnchainMarket && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  No on-chain market yet. The bot creates markets on match day.
                </p>
              )}
            </div>

            {/* User's on-chain orders */}
            {connected && userOrders.length > 0 && (
              <div className="cricket-card p-5">
                <h3 className="text-sm font-semibold mb-3">My Orders</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Side</th>
                        <th className="text-left py-2 font-medium">Price</th>
                        <th className="text-left py-2 font-medium">Matched</th>
                        <th className="text-left py-2 font-medium">Unmatched</th>
                        <th className="text-right py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userOrders.map((o) => (
                        <tr key={o.id.toString()} className="border-b border-border/50">
                          <td className={`py-2 font-semibold ${o.side === "yes" ? "text-cricket-teal" : "text-cricket-coral"}`}>
                            {o.side.toUpperCase()} {o.side === "yes" ? teamA : teamB}
                          </td>
                          <td className="py-2">${o.price.toFixed(2)}</td>
                          <td className="py-2">${o.matchedAmount.toFixed(2)}</td>
                          <td className="py-2">${o.unmatchedAmount.toFixed(2)}</td>
                          <td className="py-2 text-right">
                            {o.unmatchedAmount > 0 && o.isActive && (
                              <button
                                onClick={() => matchWinnerAddr && cancelOrder(matchWinnerAddr, o.id)}
                                disabled={isCancelling}
                                className="text-cricket-coral hover:underline font-medium"
                              >
                                {isCancelling ? <Loader2 size={12} className="animate-spin inline" /> : "Cancel"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Claim winnings button */}
            {connected && onchainMarket?.isSettled && matchWinnerAddr && (
              <div className="cricket-card p-5 text-center space-y-3">
                <h3 className="font-bold text-sm">Market Settled</h3>
                <p className="text-sm text-muted-foreground">
                  {onchainMarket.outcome === 1 ? teamA : teamB} won. Claim your winnings + unmatched refunds.
                </p>
                <Button
                  onClick={() => claimAll(matchWinnerAddr)}
                  disabled={isClaiming}
                  className="bg-cricket-success text-white hover:bg-cricket-success/90"
                >
                  {isClaiming ? <><Loader2 size={16} className="mr-2 animate-spin" /> Claiming...</> : "Claim All"}
                </Button>
              </div>
            )}

            {/* Recent trades (mock for now) */}
            <div className="cricket-card p-5">
              <h3 className="text-sm font-semibold mb-3">Recent Trades</h3>
              <div className="space-y-2">
                {recentTrades.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5">
                    <span className={`font-semibold ${t.side === "yes" ? "text-cricket-teal" : "text-cricket-coral"}`}>
                      {t.side.toUpperCase()} at ${t.price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">${t.amount.toFixed(2)}</span>
                    <span className="text-muted-foreground">{t.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Betting panel */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <BettingPanel market={marketForPanel} marketAddress={matchWinnerAddr} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MarketDetail;
