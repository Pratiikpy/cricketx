import axios from "axios";
import { config } from "./config";

const NEYNAR_BASE = "https://api.neynar.com/v2/farcaster";

async function postCast(text: string): Promise<void> {
  if (!config.neynarApiKey || !config.neynarSignerUuid) {
    console.log("[Farcaster] Skipping (not configured):", text.slice(0, 80));
    return;
  }

  await axios.post(
    `${NEYNAR_BASE}/cast`,
    {
      signer_uuid: config.neynarSignerUuid,
      text,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.neynarApiKey,
      },
    }
  );
  console.log("[Farcaster] Posted:", text.slice(0, 80));
}

export async function postMarketCreated(
  teamA: string,
  teamB: string,
  matchId: string
): Promise<void> {
  const text = [
    `${teamA} vs ${teamB} today!`,
    `Match Winner and Toss Winner markets are LIVE on CricketX.`,
    `Predict now: ${config.appUrl}/market/${matchId}`,
  ].join("\n\n");

  await postCast(text);
}

export async function postTossResult(
  teamA: string,
  teamB: string,
  tossWinner: string,
  tossChoice: string
): Promise<void> {
  const text = [
    `TOSS: ${tossWinner} won the toss and chose to ${tossChoice}!`,
    `${teamA} vs ${teamB} — Toss market settled. Winners claim now.`,
    config.appUrl,
  ].join("\n\n");

  await postCast(text);
}

export async function postMatchResult(
  teamA: string,
  teamB: string,
  matchWinner: string,
  statusText: string
): Promise<void> {
  const text = [
    `MATCH RESULT: ${matchWinner} wins! ${statusText}`,
    `${teamA} vs ${teamB} — Market settled. Check your winnings:`,
    config.appUrl,
  ].join("\n\n");

  await postCast(text);
}

export async function postVolumeMilestone(
  teamA: string,
  teamB: string,
  volumeUsd: number
): Promise<void> {
  const text = [
    `$${volumeUsd.toLocaleString()} in predictions on today's ${teamA} vs ${teamB} match!`,
    `Join the action: ${config.appUrl}`,
  ].join("\n\n");

  await postCast(text);
}
