import { CricMatch, getMatchStatus, getTeamShort, formatScore } from "@/services/cricketApi";
import { teamLogos } from "@/assets/teams";
import { MapPin, Clock, Trophy } from "lucide-react";
import MatchCountdown from "./MatchCountdown";
import SparklineChart from "./SparklineChart";

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "live")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cricket-success/15 text-cricket-success">
        <span className="w-1.5 h-1.5 rounded-full bg-cricket-success animate-pulse" />
        LIVE
      </span>
    );
  if (status === "completed")
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
        Completed
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
      {logo ? (
        <img src={logo} alt={short} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
          {short.charAt(0)}
        </div>
      )}
      <span className="font-semibold text-sm">{short}</span>
    </div>
  );
};

interface Props {
  match: CricMatch;
}

const CricketMatchCard = ({ match }: Props) => {
  const status = getMatchStatus(match);
  const teamA = match.teams?.[0] || "TBD";
  const teamB = match.teams?.[1] || "TBD";
  const shortA = getTeamShort(teamA);
  const shortB = getTeamShort(teamB);
  const matchDate = new Date(match.dateTimeGMT);
  const dateStr = matchDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = matchDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const scoreStr = formatScore(match.score);

  // Generate mock yes/no prices for the prediction market UI
  const yesPrice = Math.round((0.4 + Math.random() * 0.3) * 100) / 100;
  const noPrice = Math.round((1 - yesPrice) * 100) / 100;

  return (
    <div className="cricket-card p-5 space-y-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamBadge short={shortA} />
          <span className="text-xs font-bold text-muted-foreground">VS</span>
          <TeamBadge short={shortB} />
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Score (live/completed) */}
      {scoreStr && (
        <div className="text-sm font-semibold text-foreground bg-secondary/50 rounded-lg px-3 py-2">
          {scoreStr}
        </div>
      )}

      {/* Result for completed */}
      {status === "completed" && match.matchWinner && (
        <div className="flex items-center gap-1.5 text-sm font-semibold text-cricket-success">
          <Trophy size={14} />
          {getTeamShort(match.matchWinner)} won
          {match.status && <span className="text-xs text-muted-foreground ml-1">— {match.status}</span>}
        </div>
      )}

      {/* Toss info */}
      {match.tossWinner && (
        <div className="text-xs text-muted-foreground">
          🪙 {getTeamShort(match.tossWinner)} won toss{match.tossChoice ? `, chose to ${match.tossChoice}` : ""}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {dateStr} • {timeStr}
        </span>
        {match.venue && (
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {match.venue.split(",")[0]}
          </span>
        )}
      </div>

      {/* Countdown for upcoming */}
      {status === "upcoming" && <MatchCountdown targetDate={match.dateTimeGMT} />}

      {/* Mock prediction market */}
      {status !== "completed" && (
        <div className="p-3 rounded-lg bg-secondary/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">🏏 Match Winner Prediction</span>
            <SparklineChart basePrice={yesPrice} />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold bg-cricket-teal/10 text-cricket-teal hover:bg-cricket-teal/20 transition-all">
              YES {shortA} <span className="ml-1 opacity-75">${yesPrice.toFixed(2)}</span>
            </button>
            <button className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold bg-cricket-coral/10 text-cricket-coral hover:bg-cricket-coral/20 transition-all">
              NO {shortB} <span className="ml-1 opacity-75">${noPrice.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CricketMatchCard;
