import type { Match } from "@/types/fut";

export const VOTING_WINDOW_DAYS = 7;
export const VOTING_WINDOW_MS = VOTING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export type EffectiveMatchPhase =
  | "signup_open"
  | "voting_open"
  | "voting_expired"
  | "finished";

/**
 * Automatically determines the live phase of a match from its status and kickoff time:
 * - Before kickoff -> signup_open (visible in Home)
 * - From kickoff to kickoff + 7 days -> voting_open (visible in /vote)
 * - Past kickoff + 7 days (not yet closed by admin) -> voting_expired
 * - Finished -> finished (visible in /stats)
 */
export function getEffectiveMatchPhase(
  match: Pick<Match, "status" | "match_date">,
  nowMs: number = Date.now()
): EffectiveMatchPhase {
  if (match.status === "finished") return "finished";

  const kickoffMs = new Date(match.match_date).getTime();
  if (nowMs < kickoffMs) return "signup_open";

  if (nowMs < kickoffMs + VOTING_WINDOW_MS) return "voting_open";

  return "voting_expired";
}

export function getVotingDeadline(match: Pick<Match, "match_date">): Date {
  return new Date(new Date(match.match_date).getTime() + VOTING_WINDOW_MS);
}

export function getVotingRemainingLabel(
  match: Pick<Match, "match_date">,
  nowMs: number = Date.now()
): string {
  const remaining =
    new Date(match.match_date).getTime() + VOTING_WINDOW_MS - nowMs;
  if (remaining <= 0) return "Plazo finalizado";

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);

  if (days > 0) {
    return `Quedan ${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `Quedan ${hours}h ${minutes}m`;
  }
  return `Quedan ${minutes}m`;
}
