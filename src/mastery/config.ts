/**
 * Centralized mastery thresholds and assisted-answer weighting.
 * Mastery is derived from elementStats — not persisted.
 */

export type MasteryLevel =
	| 'UNSEEN'
	| 'LEARNING'
	| 'FAMILIAR'
	| 'MASTERED'

export const MASTERY_LEVELS: readonly MasteryLevel[] = [
	'UNSEEN',
	'LEARNING',
	'FAMILIAR',
	'MASTERED',
] as const

export const MASTERY_LABELS_RU: Record<MasteryLevel, string> = {
	UNSEEN: 'Не изучен',
	LEARNING: 'Изучается',
	FAMILIAR: 'Знаком',
	MASTERED: 'Освоен',
}

/**
 * Tunable mastery model. Changing values does not require a storage migration.
 */
export const MASTERY_CONFIG = {
	/** Assisted (second-chance) answers count as this fraction of a first-try correct. */
	assistedCorrectWeight: 0.5,
	familiar: {
		minShown: 3,
		minEffectiveAccuracy: 0.65,
	},
	mastered: {
		minShown: 5,
		minFirstTryAccuracy: 0.8,
		/** Wrong answers / shown must stay at or below this ratio. */
		maxWrongRatio: 0.25,
		/** Assisted answers / shown must stay below this (blocks assisted-heavy mastery). */
		maxAssistedRatio: 0.35,
	},
} as const

/** Single-element contextual training (not listed on Modes screen). */
export const ELEMENT_TRAINING_QUESTION_COUNT = 5
export const ELEMENT_TRAINING_MAX_ATOMS = 5
