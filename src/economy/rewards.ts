import { ATOM_ECONOMY_CONFIG } from './config'

export interface AtomRewardInput {
	correctCount: number
	wrongCount: number
	questionCount: number
	bestStreak: number
	isNewBestScore: boolean
}

/**
 * Transparent breakdown of atom rewards for a completed classic sprint.
 */
export interface AtomRewardBreakdown {
	baseCorrect: number
	streakBonuses: number
	completion: number
	perfect: number
	newRecord: number
	total: number
}

/**
 * Pure reward calculator — used at session completion only.
 * Incorrect answers do not contribute to baseCorrect.
 */
export function calculateAtomRewards(
	input: AtomRewardInput,
	config: typeof ATOM_ECONOMY_CONFIG = ATOM_ECONOMY_CONFIG,
): AtomRewardBreakdown {
	const baseCorrect = Math.max(0, input.correctCount) * config.correctAnswer

	let streakBonuses = 0
	if (input.bestStreak >= 10) {
		streakBonuses += config.streak10Bonus
	} else if (input.bestStreak >= 5) {
		streakBonuses += config.streak5Bonus
	}

	const completion =
		input.correctCount + input.wrongCount >= input.questionCount &&
		input.questionCount > 0
			? config.gameCompletedBonus
			: 0

	const perfect =
		input.questionCount > 0 && input.correctCount === input.questionCount
			? config.perfectGameBonus
			: 0

	const newRecord = input.isNewBestScore ? config.newBestScoreBonus : 0

	const total = baseCorrect + streakBonuses + completion + perfect + newRecord

	return {
		baseCorrect,
		streakBonuses,
		completion,
		perfect,
		newRecord,
		total,
	}
}
