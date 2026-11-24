import type { PlayerCareerStats } from "@/types/fut";

export const BONUS_CONFIG = {
  goalsPerPoint: 4,
  maxGoalsBonus: 2,
  mvpsPerPoint: 1,
  maxMvpBonus: 3,
  winsPerPoint: 3,
  maxWinsBonus: 2,
  maxTotalBonus: 6,
} as const;

export interface PerformanceBonusBreakdown {
  totalBonus: number;
  goalsBonus: number;
  mvpBonus: number;
  winsBonus: number;
  goalsToNextPoint: number | null;
  winsToNextPoint: number | null;
}

/**
 * Computes the performance bonus (0..6) earned from goals, MVPs, and wins.
 * Pure function so it can be used both in the store and in UI breakdowns.
 */
export function computePerformanceBonus(
  stats: Pick<PlayerCareerStats, "goals" | "mvpAwards" | "wins">
): PerformanceBonusBreakdown {
  const goalsBonus = Math.min(
    BONUS_CONFIG.maxGoalsBonus,
    Math.floor(stats.goals / BONUS_CONFIG.goalsPerPoint)
  );
  const mvpBonus = Math.min(
    BONUS_CONFIG.maxMvpBonus,
    Math.floor(stats.mvpAwards / BONUS_CONFIG.mvpsPerPoint)
  );
  const winsBonus = Math.min(
    BONUS_CONFIG.maxWinsBonus,
    Math.floor(stats.wins / BONUS_CONFIG.winsPerPoint)
  );

  const totalBonus = Math.min(
    BONUS_CONFIG.maxTotalBonus,
    goalsBonus + mvpBonus + winsBonus
  );

  const goalsToNextPoint =
    goalsBonus < BONUS_CONFIG.maxGoalsBonus
      ? BONUS_CONFIG.goalsPerPoint -
        (stats.goals % BONUS_CONFIG.goalsPerPoint)
      : null;

  const winsToNextPoint =
    winsBonus < BONUS_CONFIG.maxWinsBonus
      ? BONUS_CONFIG.winsPerPoint - (stats.wins % BONUS_CONFIG.winsPerPoint)
      : null;

  return {
    totalBonus,
    goalsBonus,
    mvpBonus,
    winsBonus,
    goalsToNextPoint,
    winsToNextPoint,
  };
}
