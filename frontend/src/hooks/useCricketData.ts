import { useQuery } from "@tanstack/react-query";
import {
  getAllMatches,
  getCurrentMatches,
  getMatchInfo,
  CricMatch,
  getMatchStatus,
  isIPLMatch,
  MatchStatus,
} from "@/services/cricketApi";

export function useAllMatches() {
  return useQuery<CricMatch[]>({
    queryKey: ["cricket", "allMatches"],
    queryFn: getAllMatches,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useLiveMatches() {
  return useQuery<CricMatch[]>({
    queryKey: ["cricket", "currentMatches"],
    queryFn: getCurrentMatches,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });
}

export function useMatchDetail(matchId: string | undefined) {
  return useQuery<CricMatch>({
    queryKey: ["cricket", "match", matchId],
    queryFn: () => getMatchInfo(matchId!),
    enabled: !!matchId,
    staleTime: 30 * 1000,
    retry: 2,
  });
}

// Combine all + live and categorize
export function useCricketMatches() {
  const allQuery = useAllMatches();
  const liveQuery = useLiveMatches();

  const allMatches = allQuery.data || [];
  const liveMatches = liveQuery.data || [];

  // Merge: live matches override same IDs from all
  const matchMap = new Map<string, CricMatch>();
  allMatches.forEach((m) => matchMap.set(m.id, m));
  liveMatches.forEach((m) => matchMap.set(m.id, m));

  const combined = Array.from(matchMap.values());

  // Filter for cricket matches (preferably IPL, but show all if none)
  const iplMatches = combined.filter(isIPLMatch);
  const matches = iplMatches.length > 0 ? iplMatches : combined.filter(m => m.matchType === "t20" || m.matchType === "odi" || m.matchType === "test");

  const categorized = {
    live: matches.filter((m) => getMatchStatus(m) === "live"),
    upcoming: matches.filter((m) => getMatchStatus(m) === "upcoming").sort(
      (a, b) => new Date(a.dateTimeGMT).getTime() - new Date(b.dateTimeGMT).getTime()
    ),
    completed: matches.filter((m) => getMatchStatus(m) === "completed").sort(
      (a, b) => new Date(b.dateTimeGMT).getTime() - new Date(a.dateTimeGMT).getTime()
    ),
  };

  return {
    matches: categorized,
    isLoading: allQuery.isLoading && liveQuery.isLoading,
    isError: allQuery.isError && liveQuery.isError,
    error: allQuery.error || liveQuery.error,
    lastUpdated: new Date(),
  };
}
