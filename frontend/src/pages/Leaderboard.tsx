import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { leaderboard } from "@/data/mockData";
import { Flame, Trophy } from "lucide-react";

const timeFilters = ["This Week", "This Month", "All Time"];

const rankIcon = (rank: number) => {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm text-muted-foreground font-bold">{rank}</span>;
};

const Leaderboard = () => {
  const [timeFilter, setTimeFilter] = useState("All Time");

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Trophy size={24} className="text-accent" />
            Leaderboard
          </h1>
          <div className="flex gap-1 bg-secondary rounded-xl p-1">
            {timeFilters.map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeFilter === f
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {leaderboard.slice(0, 3).map((entry) => (
            <Link
              key={entry.rank}
              to={`/user/${encodeURIComponent(entry.address)}`}
              className="cricket-card p-4 text-center space-y-2 hover:-translate-y-1 transition-all duration-200"
            >
              <div>{rankIcon(entry.rank)}</div>
              <div className="font-bold text-sm">{entry.address}</div>
              <div className="text-xl font-extrabold text-cricket-success">+${entry.netProfit.toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground">{entry.winRate}% win rate • {entry.bets} bets</div>
              {entry.streak > 0 && (
                <div className="inline-flex items-center gap-1 text-xs text-accent font-semibold">
                  <Flame size={12} /> {entry.streak} streak
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Table */}
        <div className="cricket-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rank</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Bets</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Win Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Net Profit</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Streak</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.rank} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4">{rankIcon(entry.rank)}</td>
                    <td className="py-3 px-4 font-semibold">
                      <Link to={`/user/${encodeURIComponent(entry.address)}`} className="hover:text-accent transition-colors">
                        {entry.address}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{entry.bets}</td>
                    <td className="py-3 px-4">{entry.winRate}%</td>
                    <td className={`py-3 px-4 font-semibold ${entry.netProfit >= 0 ? "text-cricket-success" : "text-cricket-coral"}`}>
                      {entry.netProfit >= 0 ? "+" : ""}${entry.netProfit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {entry.streak > 0 ? (
                        <span className="inline-flex items-center gap-1 text-accent font-semibold">
                          <Flame size={14} /> {entry.streak}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
