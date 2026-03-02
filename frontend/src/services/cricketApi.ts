const API_BASE = "https://api.cricapi.com/v1";
const API_KEY = "83a6133e-cfe1-484d-8912-0c68351549c7";

export interface CricMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  score?: { r: number; w: number; o: number; inning: string }[];
  tossWinner?: string;
  tossChoice?: string;
  matchWinner?: string;
  series_id?: string;
  fantasyEnabled?: boolean;
}

export type MatchStatus = "upcoming" | "live" | "completed";

export const IPL_TEAMS: Record<string, { short: string; color: string }> = {
  "Chennai Super Kings": { short: "CSK", color: "#FFCB05" },
  "Mumbai Indians": { short: "MI", color: "#004BA0" },
  "Royal Challengers Bengaluru": { short: "RCB", color: "#EC1C24" },
  "Royal Challengers Bangalore": { short: "RCB", color: "#EC1C24" },
  "Kolkata Knight Riders": { short: "KKR", color: "#3A225D" },
  "Sunrisers Hyderabad": { short: "SRH", color: "#FF822A" },
  "Delhi Capitals": { short: "DC", color: "#004C93" },
  "Punjab Kings": { short: "PBKS", color: "#DD1F2D" },
  "Rajasthan Royals": { short: "RR", color: "#EA1A85" },
  "Gujarat Titans": { short: "GT", color: "#1C1C2B" },
  "Lucknow Super Giants": { short: "LSG", color: "#A72056" },
};

export function getTeamShort(fullName: string): string {
  return IPL_TEAMS[fullName]?.short || fullName.slice(0, 3).toUpperCase();
}

export function getMatchStatus(match: CricMatch): MatchStatus {
  if (match.matchWinner) return "completed";
  if (match.tossWinner && !match.matchWinner) return "live";
  const matchTime = new Date(match.dateTimeGMT);
  if (matchTime > new Date()) return "upcoming";
  return "live";
}

// --- Caching ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(`cricketx_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > maxAgeMs) {
      localStorage.removeItem(`cricketx_${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`cricketx_${key}`, JSON.stringify(entry));
  } catch {}
}

// --- API calls ---

export async function searchSeries(query: string) {
  const res = await fetch(`${API_BASE}/series?apikey=${API_KEY}&offset=0&search=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Series search failed: ${res.status}`);
  return res.json();
}

export async function getSeriesMatches(seriesId: string): Promise<CricMatch[]> {
  const cached = getCache<CricMatch[]>(`series_${seriesId}`, 24 * 60 * 60 * 1000);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/series_info?apikey=${API_KEY}&id=${seriesId}`);
  if (!res.ok) throw new Error(`Series info failed: ${res.status}`);
  const json = await res.json();
  
  if (json.status !== "success") throw new Error(json.reason || "API error");
  
  const matches: CricMatch[] = json.data?.matchList?.filter((m: any) => m.id) || [];
  setCache(`series_${seriesId}`, matches);
  return matches;
}

export async function getCurrentMatches(): Promise<CricMatch[]> {
  const cached = getCache<CricMatch[]>("current_matches", 60 * 1000);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/currentMatches?apikey=${API_KEY}&offset=0`);
  if (!res.ok) throw new Error(`Current matches failed: ${res.status}`);
  const json = await res.json();
  
  if (json.status !== "success") throw new Error(json.reason || "API error");
  
  const matches: CricMatch[] = json.data || [];
  setCache("current_matches", matches);
  return matches;
}

export async function getMatchInfo(matchId: string): Promise<CricMatch> {
  // Check if completed match is cached permanently
  const cached = getCache<CricMatch>(`match_${matchId}`, Infinity);
  if (cached && cached.matchWinner) return cached;

  const res = await fetch(`${API_BASE}/match_info?apikey=${API_KEY}&id=${matchId}`);
  if (!res.ok) throw new Error(`Match info failed: ${res.status}`);
  const json = await res.json();
  
  if (json.status !== "success") throw new Error(json.reason || "API error");
  
  const match: CricMatch = json.data;
  if (match.matchWinner) {
    setCache(`match_${matchId}`, match); // cache permanently for completed
  }
  return match;
}

export async function getAllMatches(): Promise<CricMatch[]> {
  const cached = getCache<CricMatch[]>("all_matches", 5 * 60 * 1000);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/matches?apikey=${API_KEY}&offset=0`);
  if (!res.ok) throw new Error(`Matches failed: ${res.status}`);
  const json = await res.json();
  
  if (json.status !== "success") throw new Error(json.reason || "API error");
  
  const matches: CricMatch[] = json.data || [];
  setCache("all_matches", matches);
  return matches;
}

// Filter for IPL/cricket matches
export function isIPLMatch(match: CricMatch): boolean {
  if (!match.teams || match.teams.length < 2) return false;
  return match.teams.some((t) => IPL_TEAMS[t] !== undefined);
}

// Format score display
export function formatScore(score?: CricMatch["score"]): string {
  if (!score || score.length === 0) return "";
  return score
    .map((s) => {
      const teamShort = getTeamShort(s.inning.replace(/\s*Inning\s*\d*/i, "").trim());
      return `${teamShort} ${s.r}/${s.w} (${s.o} ov)`;
    })
    .join(" • ");
}
