import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface Props {
  basePrice: number;
  className?: string;
}

const SparklineChart = ({ basePrice, className = "" }: Props) => {
  const data = useMemo(() => {
    const points = [];
    let price = basePrice - 0.1 + Math.random() * 0.05;
    for (let i = 0; i < 20; i++) {
      price += (Math.random() - 0.48) * 0.04;
      price = Math.max(0.05, Math.min(0.95, price));
      points.push({ v: Math.round(price * 100) / 100 });
    }
    // End near current price
    points.push({ v: basePrice });
    return points;
  }, [basePrice]);

  const trending = data[data.length - 1].v >= data[0].v;

  return (
    <div className={`h-8 w-20 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={trending ? "hsl(var(--cricket-success))" : "hsl(var(--cricket-coral))"}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
