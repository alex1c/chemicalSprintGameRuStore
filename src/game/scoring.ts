/**
 * Transparent scoring config for classic quiz sessions.
 * Balance numbers live here so the engine stays tunable later.
 */
export const SCORING_CONFIG = {
	/** Points awarded for each correct answer. */
	pointsPerCorrect: 10,
	/** Bonus points added once per consecutive correct answer in the streak. */
	streakBonusPerStep: 2,
	/** Maximum streak bonus applied on a single correct answer. */
	maxStreakBonus: 20,
} as const

export type ScoringConfig = typeof SCORING_CONFIG

/**
 * Compute score delta for a correct answer given the streak AFTER increment.
 */
export function computeCorrectAnswerPoints(
	streakAfterIncrement: number,
	config: ScoringConfig = SCORING_CONFIG,
): number {
	const streakBonus = Math.min(
		Math.max(streakAfterIncrement - 1, 0) * config.streakBonusPerStep,
		config.maxStreakBonus,
	)
	return config.pointsPerCorrect + streakBonus
}
