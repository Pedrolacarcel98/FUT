import {
  standardTierFromOverall,
  type CardTier,
  type Match,
  type MatchPlayer,
} from "@/types/fut";

export const BONUS_CONFIG = {
  formWindowMatches: 5,
  pointsPerGoal: 1,
  hatTrickMinGoals: 3,
  hatTrickBonus: 2,
  topScorerBonus: 2,
  assistsPerPoint: 2,
  winBonus: 1,
  winStreakLength: 3,
  winStreakBonus: 2,
  heavyLossGoalDiff: 4,
  heavyLossPenalty: -1,
  lossStreakLength: 3,
  lossStreakPenalty: -2,
  minTotalBonus: -6,
  maxTotalBonus: 15,
  totyMvpThreshold: 3,
  iconMatchesThreshold: 15,
  iconMvpThreshold: 6,
} as const;

export interface PerformanceBonusBreakdown {
  totalBonus: number;
  goalsBonus: number;
  hatTricksBonus: number;
  topScorerBonus: number;
  assistsBonus: number;
  winsBonus: number;
  winStreakBonus: number;
  heavyLossPenalty: number;
  lossStreakPenalty: number;
  windowMatchesCount: number;
  totalMvps: number;
  totalMatchesPlayed: number;
}

/**
 * Evaluates a player's dynamic performance bonus over their last 5 played matches
 * (Estado de Forma), plus cumulative career counts for automatic TOTY/ICON milestones.
 */
export function computePlayerPerformanceBonus(
  playerId: string,
  matches: Match[],
  matchPlayers: MatchPlayer[]
): PerformanceBonusBreakdown {
  const matchById = new Map(matches.map((m) => [m.id, m]));

  // All completed / voting-open appearances sorted newest-first
  const allAppearances = matchPlayers
    .filter((mp) => {
      if (mp.player_id !== playerId) return false;
      const m = matchById.get(mp.match_id);
      return Boolean(
        m && (m.status === "finished" || m.status === "voting_open")
      );
    })
    .sort((a, b) => {
      const ma = matchById.get(a.match_id)!;
      const mb = matchById.get(b.match_id)!;
      return (
        new Date(mb.match_date).getTime() - new Date(ma.match_date).getTime()
      );
    });

  const totalMatchesPlayed = allAppearances.length;
  const totalMvps = matches.filter(
    (m) => m.status === "finished" && m.mvp_player_id === playerId
  ).length;

  const recentWindow = allAppearances.slice(0, BONUS_CONFIG.formWindowMatches);

  let goalsCount = 0;
  let assistsCount = 0;
  let hatTricksCount = 0;
  let topScorerCount = 0;
  let winsCount = 0;
  let heavyLossesCount = 0;
  const outcomes: ("W" | "D" | "L")[] = [];

  for (const app of recentWindow) {
    const match = matchById.get(app.match_id)!;
    goalsCount += app.goals;
    assistsCount += app.assists;

    if (app.goals >= BONUS_CONFIG.hatTrickMinGoals) {
      hatTricksCount += 1;
    }

    // Check if player is top scorer of this match (min 1 goal)
    if (app.goals > 0) {
      const sameMatchPlayers = matchPlayers.filter(
        (mp) => mp.match_id === app.match_id
      );
      const maxGoalsInMatch = sameMatchPlayers.reduce(
        (max, mp) => Math.max(max, mp.goals),
        0
      );
      if (app.goals === maxGoalsInMatch) {
        topScorerCount += 1;
      }
    }

    const myScore = app.team === "A" ? match.score_a : match.score_b;
    const oppScore = app.team === "A" ? match.score_b : match.score_a;
    const diff = myScore - oppScore;

    if (diff > 0) {
      winsCount += 1;
      outcomes.push("W");
    } else if (diff < 0) {
      outcomes.push("L");
      if (Math.abs(diff) >= BONUS_CONFIG.heavyLossGoalDiff) {
        heavyLossesCount += 1;
      }
    } else {
      outcomes.push("D");
    }
  }

  // Active streaks on the 3 most recent played matches
  const hasWinStreak =
    outcomes.length >= BONUS_CONFIG.winStreakLength &&
    outcomes
      .slice(0, BONUS_CONFIG.winStreakLength)
      .every((o) => o === "W");

  const hasLossStreak =
    outcomes.length >= BONUS_CONFIG.lossStreakLength &&
    outcomes
      .slice(0, BONUS_CONFIG.lossStreakLength)
      .every((o) => o === "L");

  const goalsBonus = goalsCount * BONUS_CONFIG.pointsPerGoal;
  const hatTricksBonus = hatTricksCount * BONUS_CONFIG.hatTrickBonus;
  const topScorerBonus = topScorerCount * BONUS_CONFIG.topScorerBonus;
  const assistsBonus = Math.floor(assistsCount / BONUS_CONFIG.assistsPerPoint);
  const winsBonus = winsCount * BONUS_CONFIG.winBonus;
  const winStreakBonus = hasWinStreak ? BONUS_CONFIG.winStreakBonus : 0;
  const heavyLossPenalty = heavyLossesCount * BONUS_CONFIG.heavyLossPenalty;
  const lossStreakPenalty = hasLossStreak ? BONUS_CONFIG.lossStreakPenalty : 0;

  const rawSum =
    goalsBonus +
    hatTricksBonus +
    topScorerBonus +
    assistsBonus +
    winsBonus +
    winStreakBonus +
    heavyLossPenalty +
    lossStreakPenalty;

  const totalBonus = Math.max(
    BONUS_CONFIG.minTotalBonus,
    Math.min(BONUS_CONFIG.maxTotalBonus, rawSum)
  );

  return {
    totalBonus,
    goalsBonus,
    hatTricksBonus,
    topScorerBonus,
    assistsBonus,
    winsBonus,
    winStreakBonus,
    heavyLossPenalty,
    lossStreakPenalty,
    windowMatchesCount: recentWindow.length,
    totalMvps,
    totalMatchesPlayed,
  };
}

/**
 * Resolves a player's effective card tier with strict FIFA + automatic special milestones:
 * 1. ICON (15 matches or 6 MVPs or manual admin ICON)
 * 2. TOTY/TOTS (3+ MVPs or manual admin TOTY)
 * 3. TOTW (reigning matchday MVP)
 * 4. Standard FIFA tier by overall (bronze <65, silver 65-74, gold 75+)
 */
export function resolveEffectiveCardTier(params: {
  overall: number;
  storedTier: CardTier;
  totalMvps: number;
  totalMatchesPlayed: number;
}): CardTier {
  const { overall, storedTier, totalMvps, totalMatchesPlayed } = params;

  if (
    storedTier === "icon" ||
    totalMatchesPlayed >= BONUS_CONFIG.iconMatchesThreshold ||
    totalMvps >= BONUS_CONFIG.iconMvpThreshold
  ) {
    return "icon";
  }

  if (storedTier === "tots" || totalMvps >= BONUS_CONFIG.totyMvpThreshold) {
    return "tots";
  }

  if (storedTier === "totw") {
    return "totw";
  }

  return standardTierFromOverall(overall);
}
