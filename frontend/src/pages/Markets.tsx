import { useState } from "react";
import Layout from "@/components/Layout";
import MatchCard from "@/components/MatchCard";
import CricketMatchCard from "@/components/CricketMatchCard";
import MatchCardSkeleton from "@/components/MatchCardSkeleton";
import { useCricketMatches } from "@/hooks/useCricketData";
import { Search, Wifi, WifiOff, Loader2 } from "lucide-react";

type TabValue = "live" | "upcoming" | "completed";

const tabs: { label: string; value: TabValue }[] = [
  { label: "Live", value: "live" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Completed", value: "completed" },
];

const Markets = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("live");
  const [search, setSearch] = useState("");
  const { matches: realMatches, isLoading, isError, lastUpdated } = useCricketMatches();

  // Real matches filtered
  const realFiltered = (realMatches[activeTab] || []).filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.teams?.some((t) => t.toLowerCase().includes(q)) ||
      m.venue?.toLowerCase().includes(q)
    );
  });

  const totalMatches = (realMatches.live?.length || 0) + (realMatches.upcoming?.length || 0) + (realMatches.completed?.length || 0);

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">Markets</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isError ? (
              <span className="flex items-center gap-1 text-cricket-coral"><WifiOff size={12} /> Offline</span>
            ) : (
              <span className="flex items-center gap-1 text-cricket-success"><Wifi size={12} /> Live</span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search teams, venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 w-fit">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                activeTab === t.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.value === "live" && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-cricket-success inline-block animate-pulse" />
              )}
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({realMatches[t.value]?.length || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <div className="col-span-2 flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 size={14} className="animate-spin" /> Fetching live cricket data...
              </div>
            </>
          ) : isError ? (
            <div className="col-span-2 text-center py-16">
              <WifiOff size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">Unable to fetch cricket data</p>
              <p className="text-xs text-muted-foreground mt-1">Check your connection or API limits (100 calls/day free tier)</p>
            </div>
          ) : realFiltered.length > 0 ? (
            realFiltered.map((m) => (
              <CricketMatchCard key={m.id} match={m} />
            ))
          ) : totalMatches > 0 && search ? (
            <p className="text-muted-foreground text-sm col-span-2 text-center py-12">
              No matches found for "{search}".
            </p>
          ) : (
            <div className="col-span-2 text-center py-16">
              <p className="text-lg font-semibold">No {activeTab} matches right now</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === "live" ? "Check back when a match is being played!" : 
                 activeTab === "upcoming" ? "No upcoming matches scheduled yet." :
                 "No completed matches to show."}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Markets;
