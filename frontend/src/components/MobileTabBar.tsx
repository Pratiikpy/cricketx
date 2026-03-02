import { Link, useLocation } from "react-router-dom";
import { BarChart3, Trophy, Wallet, LayoutGrid } from "lucide-react";

const tabs = [
  { to: "/markets", label: "Markets", icon: LayoutGrid },
  { to: "/my-bets", label: "My Bets", icon: BarChart3 },
  { to: "/leaderboard", label: "Leaders", icon: Trophy },
];

const MobileTabBar = () => {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
      <div className="flex items-center justify-around h-16">
        {tabs.map((t) => {
          const active = location.pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <t.icon size={20} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileTabBar;
