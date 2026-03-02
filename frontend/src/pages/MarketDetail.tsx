import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import OrderBookView from "@/components/OrderBookView";
import BettingPanel from "@/components/BettingPanel";
import SparklineChart from "@/components/SparklineChart";
import { matches, recentTrades, userBets, teams } from "@/data/mockData";

const MarketDetail = () => {
  const { id } = useParams<{ id: string }>();

  let foundMarket = null;
  let foundMatch = null;
  for (const match of matches) {
    const market = match.markets.find((m) => m.id === id);
    if (market) {
      foundMarket = market;
      foundMatch = match;
      break;
    }
  }

  if (!foundMarket || !foundMatch) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Market not found.</p>
          <Link to="/markets" className="text-accent underline text-sm mt-2 inline-block">Back to Markets</Link>
        </div>
      </Layout>
    );
  }

  const market = foundMarket;
  const match = foundMatch;
  const myOrders = userBets.filter((b) => b.matchId === match.id);

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
              {teams[match.teamA]?.short} vs {teams[match.teamB]?.short} — {market.label}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Clock size={12} />{match.date} • {match.time}</span>
              {match.status === "live" && (
                <span className="flex items-center gap-1 text-cricket-success font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cricket-success animate-pulse" /> LIVE
                </span>
              )}
            </div>
          </div>
          <SparklineChart basePrice={market.yesPrice} className="hidden sm:block" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order book + trades */}
          <div className="lg:col-span-2 space-y-6">
            <div className="cricket-card p-5">
              <OrderBookView yesOrders={market.orderBook.yes} noOrders={market.orderBook.no} />
            </div>

            {myOrders.length > 0 && (
              <div className="cricket-card p-5">
                <h3 className="text-sm font-semibold mb-3">My Orders</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Side</th>
                        <th className="text-left py-2 font-medium">Price</th>
                        <th className="text-left py-2 font-medium">Amount</th>
                        <th className="text-left py-2 font-medium">Status</th>
                        <th className="text-right py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myOrders.map((o) => (
                        <tr key={o.id} className="border-b border-border/50">
                          <td className={`py-2 font-semibold ${o.side === "yes" ? "text-cricket-teal" : "text-cricket-coral"}`}>
                            {o.side.toUpperCase()} {o.sideLabel}
                          </td>
                          <td className="py-2">${o.price.toFixed(2)}</td>
                          <td className="py-2">${o.amount.toFixed(2)}</td>
                          <td className="py-2 capitalize">{o.status}</td>
                          <td className="py-2 text-right">
                            {o.status === "pending" && (
                              <button className="text-cricket-coral hover:underline font-medium">Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
              <BettingPanel market={market} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MarketDetail;
