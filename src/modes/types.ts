import type { HintType } from '../economy/config'

/**
 * All playable Classic Sprint variants for PHASE 5.
 */
export type GameModeId =
	| 'CLASSIC'
	| 'TIMED_60'
	| 'NO_MISTAKE'
	| 'MIXED'
	| 'WEAK_ELEMENTS'

export type SessionEndCondition = 'fixed_count' | 'timed' | 'until_mistake'

export type ModeRecordField = 'bestScore' | 'bestCorrect'

export interface ModeFeedbackTiming {
	correctMs: number
	wrongMs: number
}

export interface ModeRewardConfig {
	/** Max atoms from correct answers (anti-farming). */
	correctCap: number
	completionBonus: number
	perfectBonus: number
	streak5Bonus: number
	streak10Bonus: number
	recordBonus: number
}

export interface GameModeConfig {
	id: GameModeId
	titleRu: string
	descriptionRu: string
	icon: string
	endCondition: SessionEndCondition
	/** Fixed question count; null means dynamic (timed / until mistake). */
	questionCount: number | null
	/** Timed mode duration in ms; null otherwise. */
	durationMs: number | null
	allowedHints: readonly HintType[]
	feedbackTiming: ModeFeedbackTiming
	reward: ModeRewardConfig
	/** Primary personal-record metric for this mode. */
	recordField: ModeRecordField
	/** Initial question pool size for dynamic modes. */
	poolSize: number
}

export type SessionEndReason =
	| 'completed'
	| 'timeout'
	| 'mistake'
	| 'insufficient_pool'
	| null
