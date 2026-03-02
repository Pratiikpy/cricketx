import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Flame, Trophy, BarChart3, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import { leaderboard } from "@/data/mockData";
import PnLChart from "@/components/PnLChart";
import { userBets } from "@/data/mockData";

const UserProfile = () => {
  const { address } = useParams<{ address: string }>();
  const user = leaderboard.find((e) => e.address === address);

  if (!user) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">User not found.</p>
          <Link to="/leaderboard" className="text-accent underline text-sm mt-2 inline-block">
            Back to Leaderboard
          </Link>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: "Total Bets", value: user.bets, icon: BarChart3, color: "text-foreground" },
    { label: "Win Rate", value: `${user.winRate}%`, icon: Trophy, color: "text-accent" },
    { label: "Net Profit", value: `${user.netProfit >= 0 ? "+" : ""}$${user.netProfit.toFixed(2)}`, icon: TrendingUp, color: user.netProfit >= 0 ? "text-cricket-success" : "text-cricket-coral" },
    { label: "Win Streak", value: user.streak, icon: Flame, color: "text-accent" },
  ];

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/leaderboard" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold">User Profile</h1>
            <p className="text-sm text-muted-foreground font-mono">{user.address}</p>
          </div>
          <div className="ml-auto">
            <span className="px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-bold">
              Rank #{user.rank}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="cricket-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* P&L Chart (mock using global bets) */}
        <div className="cricket-card p-5 mb-8">
          <h3 className="text-sm font-semibold mb-4">Performance Over Time</h3>
          <PnLChart bets={userBets} />
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
