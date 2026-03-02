import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { UserBet } from "@/data/mockData";

interface Props {
  bets: UserBet[];
}

const PnLChart = ({ bets }: Props) => {
  // Build cumulative P&L data
  const settledBets = bets.filter((b) => b.status === "won" || b.status === "lost");
  let cumulative = 0;
  const data = [{ name: "Start", pnl: 0 }];
  settledBets.forEach((b, i) => {
    if (b.status === "won") {
      cumulative += (b.payout || 0) - b.amount;
    } else {
      cumulative -= b.amount;
    }
    data.push({ name: `Bet ${i + 1}`, pnl: Math.round(cumulative * 100) / 100 });
  });

  if (data.length <= 1) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No settled bets yet for P&L chart.
      </div>
    );
  }

  const isPositive = cumulative >= 0;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
          />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke={isPositive ? "hsl(var(--cricket-success))" : "hsl(var(--cricket-coral))"}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PnLChart;
