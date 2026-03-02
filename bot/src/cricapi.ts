import axios from "axios";
import { config } from "./config";

interface CricMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  tossWinner?: string;
  tossChoice?: string;
  matchWinner?: string;
  series_id?: string;
}

const IPL_TEAMS: Record<string, string> = {
  "Chennai Super Kings": "CSK",
  "Mumbai Indians": "MI",
  "Royal Challengers Bengaluru": "RCB",
  "Royal Challengers Bangalore": "RCB",
  "Kolkata Knight Riders": "KKR",
  "Sunrisers Hyderabad": "SRH",
  "Delhi Capitals": "DC",
  "Punjab Kings": "PBKS",
  "Rajasthan Royals": "RR",
  "Gujarat Titans": "GT",
  "Lucknow Super Giants": "LSG",
};

function getTeamShort(fullName: string): string {
  return IPL_TEAMS[fullName] || fullName.slice(0, 3).toUpperCase();
}

async function apiCall<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = `${config.cricapiBase}${endpoint}`;
  const res = await axios.get(url, {
    params: { apikey: config.cricapiKey, ...params },
    timeout: 10000,
  });

  if (res.data.status !== "success") {
    throw new Error(`CricAPI error: ${res.data.reason || "Unknown error"}`);
  }
  return res.data;
}

// Search for IPL series to get the series ID
export async function searchIPLSeries(): Promise<string | null> {
  const data = await apiCall<any>("/series", { search: "IPL" });
  const series = data.data;
  if (!series || series.length === 0) return null;

  // Find current year's IPL
  const year = new Date().getFullYear();
  const current = series.find((s: any) =>
    s.name?.includes("IPL") && s.name?.includes(String(year))
  );
  return current?.id || series[0]?.id || null;
}

// Get today's matches from a series
export async function getTodaysMatches(seriesId: string): Promise<CricMatch[]> {
  const data = await apiCall<any>("/series_info", { id: seriesId });
  const matches: CricMatch[] = data.data?.matchList || [];

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return matches.filter((m) => {
    if (!m.dateTimeGMT) return false;
    const matchDate = m.dateTimeGMT.split("T")[0];
    return matchDate === today && m.id;
  });
}

// Get live/current matches
export async function getCurrentMatches(): Promise<CricMatch[]> {
  const data = await apiCall<any>("/currentMatches", { offset: "0" });
  return (data.data || []).filter((m: CricMatch) =>
    m.teams?.some((t) => IPL_TEAMS[t] !== undefined)
  );
}

// Get full match info (toss + result)
export async function getMatchResult(matchId: string): Promise<CricMatch> {
  const data = await apiCall<any>("/match_info", { id: matchId });
  return data.data;
}

// Determine outcome from team comparison
export function determineOutcome(
  winner: string,
  teamA: string,
  teamB: string
): number {
  const winnerShort = getTeamShort(winner);
  if (winnerShort === teamA) return 1; // YES
  if (winnerShort === teamB) return 2; // NO
  // Fuzzy match — compare full names too
  if (winner.includes(teamA) || teamA.includes(getTeamShort(winner))) return 1;
  if (winner.includes(teamB) || teamB.includes(getTeamShort(winner))) return 2;
  throw new Error(`Cannot determine outcome: winner="${winner}" vs teamA="${teamA}" teamB="${teamB}"`);
}

export { CricMatch, getTeamShort, IPL_TEAMS };
