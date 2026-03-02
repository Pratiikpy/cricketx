import { Link } from "react-router-dom";
import { Match, teams } from "@/data/mockData";
import { MapPin, Clock, Trophy } from "lucide-react";
import { teamLogos } from "@/assets/teams";

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "live")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cricket-success/15 text-cricket-success">
        <span className="w-1.5 h-1.5 rounded-full bg-cricket-success animate-pulse" />
        LIVE
      </span>
    );
  if (status === "settled")
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
        Settled
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/10 text-accent">
      Upcoming
    </span>
  );
};

const TeamBadge = ({ short }: { short: string }) => {
  const logo = teamLogos[short];
  return (
    <div className="flex items-center gap-2">
      <img
        src={logo}
        alt={short}
        className="w-8 h-8 rounded-full object-cover"
      />
      <span className="font-semibold text-sm">{short}</span>
    </div>
  );
};

const MatchCard = ({ match }: { match: Match }) => {
  const isSettled = match.status === "settled";

  return (
    <div className="cricket-card p-5 space-y-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamBadge short={match.teamA} />
          <span className="text-xs font-bold text-muted-foreground">VS</span>
          <TeamBadge short={match.teamB} />
        </div>
        <StatusBadge status={match.status} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock size={12} />{match.date} • {match.time}</span>
        <span className="flex items-center gap-1"><MapPin size={12} />{match.venue.split(",")[0]}</span>
      </div>

      {/* Markets */}
      {match.markets.map((market) => (
        <Link
          key={market.id}
          to={`/market/${market.id}`}
          className="block p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              {market.type === "match_winner" ? "🏏" : "🪙"} {market.label}
            </span>
            {market.result && (
              <span className="text-xs font-semibold text-cricket-success flex items-center gap-1">
                <Trophy size={12} />
                {market.result === "yes" ? market.yesLabel : market.noLabel} Won
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                isSettled && market.result
                  ? market.result === "yes"
                    ? "bg-cricket-success/15 text-cricket-success"
                    : "bg-muted text-muted-foreground"
                  : "bg-cricket-teal/10 text-cricket-teal hover:bg-cricket-teal/20"
              }`}
              disabled={isSettled}
            >
              YES {market.yesLabel} <span className="ml-1 opacity-75">${market.yesPrice.toFixed(2)}</span>
            </button>
            <button
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                isSettled && market.result
                  ? market.result === "no"
                    ? "bg-cricket-success/15 text-cricket-success"
                    : "bg-muted text-muted-foreground"
                  : "bg-cricket-coral/10 text-cricket-coral hover:bg-cricket-coral/20"
              }`}
              disabled={isSettled}
            >
              NO {market.noLabel} <span className="ml-1 opacity-75">${market.noPrice.toFixed(2)}</span>
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span>Vol: ${market.volume.toLocaleString()}</span>
            <span>Orders: {market.orders}</span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default MatchCard;
