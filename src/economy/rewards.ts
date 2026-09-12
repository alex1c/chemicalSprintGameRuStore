import { ELEMENT_TRAINING_MAX_ATOMS } from '../mastery'
import { getGameModeConfig, type GameModeId } from '../modes'
import { ATOM_ECONOMY_CONFIG } from './config'

export interface AtomRewardInput {
	correctCount: number
	wrongCount: number
	questionCount: number
	bestStreak: number
	isNewBestScore: boolean
	modeId?: GameModeId
	/** True when the session finished (fixed complete / timeout / mistake). */
	sessionCompleted?: boolean
}

/**
 * Transparent breakdown of atom rewards for a completed session.
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
 * Mode-aware reward calculator with anti-farming correct caps.
 * Incorrect answers do not contribute to baseCorrect.
 */
export function calculateAtomRewards(
	input: AtomRewardInput,
	legacyConfig: typeof ATOM_ECONOMY_CONFIG = ATOM_ECONOMY_CONFIG,
): AtomRewardBreakdown {
	const modeId = input.modeId ?? 'CLASSIC'
	const mode = getGameModeConfig(modeId)
	const reward = mode.reward

	// Contextual training never grants record bonuses.
	const allowRecord = modeId !== 'ELEMENT_TRAINING' && input.isNewBestScore

	const uncappedCorrect =
		Math.max(0, input.correctCount) * legacyConfig.correctAnswer
	const baseCorrect = Math.min(uncappedCorrect, reward.correctCap)

	let streakBonuses = 0
	if (input.bestStreak >= 10) {
		streakBonuses += reward.streak10Bonus
	} else if (input.bestStreak >= 5) {
		streakBonuses += reward.streak5Bonus
	}

	const answered = input.correctCount + input.wrongCount
	const completed =
		input.sessionCompleted ??
		(mode.endCondition === 'fixed_count'
			? answered >= (input.questionCount || mode.questionCount || 0) &&
				(input.questionCount || 0) > 0
			: answered > 0)

	const completion = completed ? reward.completionBonus : 0

	const perfect =
		mode.endCondition === 'fixed_count' &&
		input.questionCount > 0 &&
		input.correctCount === input.questionCount
			? reward.perfectBonus
			: 0

	const newRecord = allowRecord ? reward.recordBonus : 0

	let total = baseCorrect + streakBonuses + completion + perfect + newRecord

	// Hard ceiling for single-element training to prevent farm exploits.
	if (modeId === 'ELEMENT_TRAINING') {
		total = Math.min(total, ELEMENT_TRAINING_MAX_ATOMS)
	}

	return {
		baseCorrect,
		streakBonuses,
		completion,
		perfect,
		newRecord,
		total,
	}
}
