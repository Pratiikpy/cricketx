import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useWallet } from "@/context/WalletContext";
import { useAllMarketAddresses, useOnchainMarketInfo } from "@/hooks/useOnchainMarkets";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useCancelOrder } from "@/hooks/useCancelOrder";
import { useReadContract } from "wagmi";
import { CricketXMarketABI } from "@/config/contracts";
import { formatUnits } from "viem";
import { Trophy, Wallet, Loader2, BarChart3 } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { fireConfetti } from "@/hooks/useConfetti";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Tab = "all" | "active" | "won" | "lost";

const tabs: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
];

// Single market's orders for a user
function MarketOrders({
  marketAddress,
  userAddress,
  onOrdersFound,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
  onOrdersFound: (count: number) => void;
}) {
  const { market } = useOnchainMarketInfo(marketAddress);
  const { data: userOrdersData, isLoading } = useReadContract({
    address: marketAddress,
    abi: CricketXMarketABI,
    functionName: "getUserOrders",
    args: [userAddress],
  });
  const { claimAll, isLoading: isClaiming, isSuccess: claimSuccess, reset: resetClaim } = useClaimWinnings();
  const { cancelOrder, isLoading: isCancelling, isSuccess: cancelSuccess, reset: resetCancel } = useCancelOrder();
  const { toast } = useToast();

  useEffect(() => {
    if (claimSuccess) { toast({ title: "Winnings Claimed!" }); resetClaim(); }
  }, [claimSuccess]);

  useEffect(() => {
    if (cancelSuccess) { toast({ title: "Order Cancelled" }); resetCancel(); }
  }, [cancelSuccess]);

  // Report order count back to parent
  useEffect(() => {
    if (!userOrdersData) {
      onOrdersFound(0);
      return;
    }
    const [ids] = userOrdersData as [bigint[], ...unknown[]];
    onOrdersFound(ids.length);
  }, [userOrdersData]);

  if (isLoading || !userOrdersData || !market) return null;

  const [ids, sides, prices, totalAmounts, matchedAmounts, unmatchedAmounts, actives] = userOrdersData as [
    bigint[], number[], bigint[], bigint[], bigint[], bigint[], boolean[]
  ];

  if (ids.length === 0) return null;

  const orders = ids.map((orderId, i) => ({
    id: orderId,
    side: Number(sides[i]) === 1 ? "yes" as const : "no" as const,
    sideLabel: Number(sides[i]) === 1 ? market.teamA : market.teamB,
    price: Number(prices[i]) / 100,
    totalAmount: parseFloat(formatUnits(totalAmounts[i], 6)),
    matchedAmount: parseFloat(formatUnits(matchedAmounts[i], 6)),
    unmatchedAmount: parseFloat(formatUnits(unmatchedAmounts[i], 6)),
    isActive: actives[i],
    isWinner: market.isSettled && Number(sides[i]) === market.outcome,
    isLoser: market.isSettled && Number(sides[i]) !== market.outcome,
  }));

  return (
    <>
      {orders.map((o) => (
        <div
          key={`${marketAddress}-${o.id}`}
          className="cricket-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <Link to={`/market/${market.matchId}`} className="font-bold text-sm hover:text-accent transition-colors">
              {market.teamA} vs {market.teamB} — {market.marketType === 0 ? "Match Winner" : "Toss Winner"}
            </Link>
            <div className="text-xs text-muted-foreground">
              <span className={`font-semibold ${o.side === "yes" ? "text-cricket-teal" : "text-cricket-coral"}`}>
                {o.side.toUpperCase()} {o.sideLabel}
              </span>
              {" "}at ${o.price.toFixed(2)} | Total: ${o.totalAmount.toFixed(2)} | Matched: ${o.matchedAmount.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {o.isWinner && <span className="text-sm font-bold text-cricket-success">Winner</span>}
            {o.isLoser && <span className="text-sm font-bold text-cricket-coral">Lost</span>}
            {o.unmatchedAmount > 0 && o.isActive && !market.isSettled && (
              <button
                onClick={() => cancelOrder(marketAddress, o.id)}
                disabled={isCancelling}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-cricket-coral/10 text-cricket-coral hover:bg-cricket-coral/20"
              >
                {isCancelling ? <Loader2 size={12} className="animate-spin" /> : "Cancel"}
              </button>
            )}
            <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
              o.isWinner ? "bg-cricket-success/15 text-cricket-success" :
              o.isLoser ? "bg-cricket-coral/15 text-cricket-coral" :
              o.matchedAmount > 0 ? "bg-accent/10 text-accent" :
              "bg-muted text-muted-foreground"
            }`}>
              {o.isWinner ? "Won" : o.isLoser ? "Lost" : o.matchedAmount > 0 ? "Matched" : "Pending"}
            </span>
          </div>
        </div>
      ))}
      {market.isSettled && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => claimAll(marketAddress)}
            disabled={isClaiming}
            className="bg-cricket-success text-white hover:bg-cricket-success/90"
          >
            {isClaiming ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Trophy size={14} className="mr-1" />}
            Claim All ({market.teamA} vs {market.teamB})
          </Button>
        </div>
      )}
    </>
  );
}

const MyBets = () => {
  const { connected, rawAddress, connect } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [totalOrders, setTotalOrders] = useState(0);
  const [marketsChecked, setMarketsChecked] = useState(0);
  const confettiFired = useRef(false);

  const { data: allMarkets, isLoading } = useAllMarketAddresses();
  const marketAddresses = (allMarkets as `0x${string}`[] | undefined) || [];

  // Track how many markets have been checked and total orders found
  const handleOrdersFound = (count: number) => {
    setMarketsChecked((prev) => prev + 1);
    setTotalOrders((prev) => prev + count);
  };

  // Reset counts when markets change
  useEffect(() => {
    setTotalOrders(0);
    setMarketsChecked(0);
  }, [allMarkets, rawAddress]);

  useEffect(() => {
    if (activeTab === "won" && !confettiFired.current) {
      confettiFired.current = true;
      fireConfetti();
    }
    if (activeTab !== "won") confettiFired.current = false;
  }, [activeTab]);

  if (!connected) {
    return (
      <Layout>
        <div className="container py-20 text-center space-y-4">
          <Wallet size={48} className="mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-sm">Connect your wallet to see your bets.</p>
          <Button onClick={connect} className="bg-accent text-accent-foreground">
            <Wallet size={16} className="mr-2" /> Connect Wallet
          </Button>
        </div>
      </Layout>
    );
  }

  const allChecked = marketsChecked >= marketAddresses.length;
  const hasNoBets = allChecked && totalOrders === 0;

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">My Bets</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 w-fit overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                activeTab === t.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 size={24} className="mx-auto animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading your bets...</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {marketAddresses.map((addr) => (
                <MarketOrders
                  key={addr}
                  marketAddress={addr}
                  userAddress={rawAddress!}
                  onOrdersFound={handleOrdersFound}
                />
              ))}
            </div>

            {/* Show empty state when all markets checked and no orders found */}
            {hasNoBets && (
              <div className="text-center py-16 space-y-3">
                <BarChart3 size={48} className="mx-auto text-muted-foreground" />
                <h2 className="text-lg font-bold">No bets yet</h2>
                <p className="text-sm text-muted-foreground">
                  You haven't placed any predictions yet. Browse markets to get started!
                </p>
                <Link to="/markets">
                  <Button className="bg-accent text-accent-foreground mt-2">
                    Browse Markets
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default MyBets;
