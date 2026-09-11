/**
 * Centralized atom economy + hint pricing for Classic Sprint.
 * Tune balance here — keep magic numbers out of UI and session code.
 */
export const ATOM_ECONOMY_CONFIG = {
	/** One-time grant on first install / schema migration. */
	startingAtoms: 20,

	/** Atoms per correct answer (committed on session complete). */
	correctAnswer: 1,

	/** Bonus when session best streak reaches 5+. */
	streak5Bonus: 3,

	/** Bonus when session best streak reaches 10+. */
	streak10Bonus: 7,

	/** Bonus for answering every question correctly. */
	perfectGameBonus: 10,

	/** Bonus when the session sets a new personal best score. */
	newBestScoreBonus: 5,

	/** Flat bonus for finishing a classic sprint. */
	gameCompletedBonus: 3,
} as const

export const HINT_COSTS = {
	fiftyFifty: 5,
	fact: 8,
	secondChance: 10,
	saveStreak: 15,
} as const

export type HintType = keyof typeof HINT_COSTS

export const HINT_LABELS_RU: Record<HintType, string> = {
	fiftyFifty: '50/50',
	fact: 'Факт',
	secondChance: 'Вторая попытка',
	saveStreak: 'Сохранить серию',
}

/**
 * Extra feedback window when Save Streak is offered after a wrong answer.
 */
export const SAVE_STREAK_TIMING = {
	/** Opportunity window before auto-next when Save Streak is available (ms). */
	opportunityMs: 2600,
	/** Short pause after successfully saving a streak (ms). */
	savedConfirmMs: 900,
} as const
