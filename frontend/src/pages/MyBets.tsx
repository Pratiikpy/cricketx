import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { userBets } from "@/data/mockData";
import { TrendingUp, TrendingDown, BarChart3, Trophy, Download } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { fireConfetti } from "@/hooks/useConfetti";
import ShareButton from "@/components/ShareButton";
import PnLChart from "@/components/PnLChart";

type Tab = "all" | "pending" | "matched" | "won" | "lost";

const tabs: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "pending" },
  { label: "Matched", value: "matched" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
];

const AnimatedValue = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const animated = useCountUp(Math.abs(Math.round(value * 100)), 1000);
  const display = (animated / 100).toFixed(2);
  return <>{prefix}{value < 0 ? "-" : ""}{display}{suffix}</>;
};

const exportCSV = () => {
  const headers = "ID,Match,Market,Side,Label,Price,Amount,Status,Payout\n";
  const rows = userBets.map((b) =>
    `${b.id},${b.matchLabel},${b.marketType},${b.side},${b.sideLabel},${b.price},${b.amount},${b.status},${b.payout || ""}`
  ).join("\n");
  const blob = new Blob([headers + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cricketx-bets.csv";
  a.click();
  URL.revokeObjectURL(url);
};

const MyBets = () => {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const confettiFired = useRef(false);

  const filtered = userBets.filter((b) => activeTab === "all" || b.status === activeTab);

  const totalInvested = userBets.reduce((s, b) => s + b.amount, 0);
  const totalWon = userBets.filter((b) => b.status === "won").reduce((s, b) => s + (b.payout || 0), 0);
  const netPnl = totalWon - userBets.filter((b) => b.status === "lost").reduce((s, b) => s + b.amount, 0);
  const winRate = userBets.length > 0
    ? Math.round(
        (userBets.filter((b) => b.status === "won").length /
          userBets.filter((b) => b.status === "won" || b.status === "lost").length) *
          100
      ) || 0
    : 0;

  useEffect(() => {
    if (activeTab === "won" && !confettiFired.current) {
      confettiFired.current = true;
      fireConfetti();
    }
    if (activeTab !== "won") confettiFired.current = false;
  }, [activeTab]);

  const summaryCards = [
    { label: "Invested", value: totalInvested, icon: BarChart3, color: "text-foreground", prefix: "$" },
    { label: "Won", value: totalWon, icon: Trophy, color: "text-cricket-success", prefix: "$" },
    { label: "Net P&L", value: netPnl, icon: netPnl >= 0 ? TrendingUp : TrendingDown, color: netPnl >= 0 ? "text-cricket-success" : "text-cricket-coral", prefix: netPnl >= 0 ? "+$" : "$" },
    { label: "Win Rate", value: winRate, icon: Trophy, color: "text-accent", suffix: "%" },
  ];

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">My Bets</h1>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryCards.map((s) => (
            <div key={s.label} className="cricket-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className={`text-xl font-extrabold ${s.color}`}>
                {s.label === "Win Rate" ? (
                  <AnimatedValue value={s.value} suffix="%" />
                ) : (
                  <AnimatedValue value={s.value} prefix={s.prefix} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* P&L Chart */}
        <div className="cricket-card p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4">Portfolio P&L</h3>
          <PnLChart bets={userBets} />
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

        {/* Bet cards */}
        <div className="space-y-3">
          {filtered.map((bet, i) => (
            <div
              key={bet.id}
              className="cricket-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="space-y-1">
                <div className="font-bold text-sm">{bet.matchLabel} — {bet.marketType}</div>
                <div className="text-xs text-muted-foreground">
                  <span className={`font-semibold ${bet.side === "yes" ? "text-cricket-teal" : "text-cricket-coral"}`}>
                    {bet.side.toUpperCase()} {bet.sideLabel}
                  </span>
                  {" "}at ${bet.price.toFixed(2)} • ${bet.amount.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(bet.status === "won" || bet.status === "matched") && (
                  <ShareButton
                    text={`I predicted ${bet.sideLabel} ${bet.side === "yes" ? "wins" : "loses"} on CricketX! 🏏${
                      bet.status === "won" ? ` Won +$${((bet.payout || 0) - bet.amount).toFixed(2)}!` : ""
                    }`}
                  />
                )}
                {bet.status === "won" && (
                  <span className="text-sm font-bold text-cricket-success">✅ +${((bet.payout || 0) - bet.amount).toFixed(2)}</span>
                )}
                {bet.status === "lost" && (
                  <span className="text-sm font-bold text-cricket-coral">❌ -${bet.amount.toFixed(2)}</span>
                )}
                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize ${
                  bet.status === "won" ? "bg-cricket-success/15 text-cricket-success" :
                  bet.status === "lost" ? "bg-cricket-coral/15 text-cricket-coral" :
                  bet.status === "matched" ? "bg-accent/10 text-accent" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {bet.status}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">No bets in this category.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyBets;
