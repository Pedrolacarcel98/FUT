import {
  computeOverall,
  standardTierFromOverall,
  type CardTier,
  type MatchPlayer,
  type MatchVote,
  type Player,
  type PlayerRatingHistory,
} from "@/types/fut";
import { resolveEffectiveCardTier } from "./rating-bonus";

export const MIN_STAT = 50;
export const MAX_STAT = 95;
export const NON_VOTER_PENALTY = -1;

export function clampStat(value: number): number {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)));
}

/**
 * Determines the card tier from overall rating following FIFA rules:
 * - Standard cards always resolve to bronze (<65), silver (65-74), or gold (75+).
 * - Special admin cards ('tots' / 'icon') are preserved across matches.
 */
export function tierFromOverall(
  overall: number,
  currentTier?: CardTier
): CardTier {
  if (currentTier === "icon" || currentTier === "tots") return currentTier;
  return standardTierFromOverall(overall);
}

export interface ProgressionChange {
  playerId: string;
  nickname: string;
  previousOverall: number;
  newOverall: number;
  delta: number;
  previousBonus: number;
  newBonus: number;
  previousTier: CardTier;
  newTier: CardTier;
  isMvp: boolean;
  penalizedForNotVoting: boolean;
}

/**
 * Computes updated players, history entries, and a human-readable summary
 * when closing a match:
 * - Applies -1 base stat penalty (floor 50) to match participants who did not vote MVP.
 * - Applies updated performance_bonus (goals + MVPs + wins).
 * - Promotes MVP to TOTW (and reverts previous TOTW player) when promoteMvpToTotw is true.
 * - Recalculates card_tier automatically from the resulting overall.
 */
export function applyMatchProgression(params: {
  matchId: string;
  players: Player[];
  roster: MatchPlayer[];
  votes: MatchVote[];
  mvpPlayerId: string | null;
  promoteMvpToTotw: boolean;
  bonusByPlayerId?: Record<string, number>;
  milestonesByPlayerId?: Record<
    string,
    { totalMvps: number; totalMatchesPlayed: number }
  >;
}): {
  updatedPlayers: Player[];
  historyEntries: PlayerRatingHistory[];
  changes: ProgressionChange[];
} {
  const {
    matchId,
    players,
    roster,
    votes,
    mvpPlayerId,
    promoteMvpToTotw,
    bonusByPlayerId = {},
    milestonesByPlayerId = {},
  } = params;

  const rosterByPlayer = new Map(roster.map((r) => [r.player_id, r]));

  const voterIds = new Set<string>();
  for (const v of votes) {
    if (v.match_id !== matchId) continue;
    if (v.voter_player_id) {
      voterIds.add(v.voter_player_id);
    } else if (v.voter_fingerprint.startsWith("player-")) {
      voterIds.add(v.voter_fingerprint.slice("player-".length));
    }
  }

  const nowIso = new Date().toISOString();
  const historyEntries: PlayerRatingHistory[] = [];
  const changes: ProgressionChange[] = [];

  const updatedPlayers = players.map((player) => {
    const matchEntry = rosterByPlayer.get(player.id);
    const isMvp = Boolean(mvpPlayerId && player.id === mvpPlayerId);
    const prevBonus = player.performance_bonus ?? 0;
    const nextBonus = bonusByPlayerId[player.id] ?? prevBonus;

    // If a new MVP is promoted to TOTW, previous TOTW players revert to their overall tier
    let baseTier = player.card_tier;
    if (promoteMvpToTotw && mvpPlayerId && baseTier === "totw" && !isMvp) {
      baseTier = tierFromOverall(player.overall);
    }

    if (!matchEntry) {
      return baseTier !== player.card_tier
        ? { ...player, card_tier: baseTier }
        : player;
    }

    const didVote = voterIds.has(player.id);
    const penalizedForNotVoting = !didVote;
    const baseDelta = penalizedForNotVoting ? NON_VOTER_PENALTY : 0;

    const nextStats = {
      pace: clampStat(player.pace + baseDelta),
      shooting: clampStat(player.shooting + baseDelta),
      passing: clampStat(player.passing + baseDelta),
      dribbling: clampStat(player.dribbling + baseDelta),
      defending: clampStat(player.defending + baseDelta),
      physical: clampStat(player.physical + baseDelta),
    };

    const nextBaseOverall = computeOverall(nextStats, 0);
    const nextOverall = computeOverall(nextStats, nextBonus);
    const actualDelta = nextOverall - player.overall;

    const ms = milestonesByPlayerId[player.id] ?? {
      totalMvps: isMvp ? 1 : 0,
      totalMatchesPlayed: 1,
    };

    let nextPlaystyles = [...player.playstyles];
    let candidateTier: CardTier = baseTier;
    if (isMvp && promoteMvpToTotw) {
      candidateTier = "totw";
      if (!nextPlaystyles.includes("mvp")) {
        nextPlaystyles = [...nextPlaystyles.slice(0, 2), "mvp"];
      }
    }

    const nextTier = resolveEffectiveCardTier({
      overall: nextOverall,
      storedTier: candidateTier,
      totalMvps: ms.totalMvps,
      totalMatchesPlayed: ms.totalMatchesPlayed,
    });

    if (
      penalizedForNotVoting ||
      isMvp ||
      actualDelta !== 0 ||
      nextBonus !== prevBonus ||
      nextTier !== player.card_tier
    ) {
      const reasons: string[] = [];
      if (penalizedForNotVoting) reasons.push("Penalización por no votar MVP (-1)");
      if (isMvp) reasons.push("Elegido MVP del partido");
      if (nextBonus > prevBonus) {
        reasons.push(`Plus rendimiento (+${nextBonus - prevBonus})`);
      }
      const reason = reasons.join(" · ") || "Actualización post-partido";

      historyEntries.push({
        id: `hist-${matchId}-${player.id}`,
        player_id: player.id,
        match_id: matchId,
        previous_overall: player.overall,
        new_overall: nextOverall,
        delta: actualDelta,
        previous_tier: player.card_tier,
        new_tier: nextTier,
        avg_match_score: 0,
        reason,
        created_at: nowIso,
      });

      changes.push({
        playerId: player.id,
        nickname: player.nickname,
        previousOverall: player.overall,
        newOverall: nextOverall,
        delta: actualDelta,
        previousBonus: prevBonus,
        newBonus: nextBonus,
        previousTier: player.card_tier,
        newTier: nextTier,
        isMvp,
        penalizedForNotVoting,
      });
    }

    return {
      ...player,
      ...nextStats,
      base_overall: nextBaseOverall,
      performance_bonus: nextBonus,
      overall: nextOverall,
      card_tier: nextTier,
      playstyles: nextPlaystyles,
      last_delta: actualDelta,
    };
  });

  return { updatedPlayers, historyEntries, changes };
}
