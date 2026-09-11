/**
 * Gameplay timing and UX constants for Classic Sprint.
 * Keep feedback delays out of screen components.
 */
export const GAMEPLAY_TIMING = {
	/** Pause after a correct answer before auto-advancing (ms). */
	correctFeedbackMs: 850,
	/** Pause after an incorrect answer before auto-advancing (ms). */
	wrongFeedbackMs: 1400,
} as const

/** Minimum touch target size for primary interactive controls (dp). */
export const MIN_TOUCH_TARGET = 48

/** Classic sprint uses all v1 question types with balanced cycling. */
export const CLASSIC_QUESTION_TYPES = [
	'NAME_TO_SYMBOL',
	'SYMBOL_TO_NAME',
	'NAME_TO_ATOMIC_NUMBER',
	'ATOMIC_NUMBER_TO_NAME',
	'NAME_TO_GROUP',
	'ELEMENT_TO_CLASSIFICATION',
] as const
