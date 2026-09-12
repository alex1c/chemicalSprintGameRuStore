import type { GameModeConfig, GameModeId } from './types'

const ALL_HINTS = [
	'fiftyFifty',
	'fact',
	'secondChance',
	'saveStreak',
] as const

const NO_SAVE_STREAK = ['fiftyFifty', 'fact', 'secondChance'] as const

/**
 * Central registry of playable modes. UI and session factories read from here.
 */
export const GAME_MODE_CONFIGS: Record<GameModeId, GameModeConfig> = {
	CLASSIC: {
		id: 'CLASSIC',
		titleRu: 'Классический',
		descriptionRu: '10 вопросов · сбалансированная тренировка',
		icon: '🧪',
		endCondition: 'fixed_count',
		questionCount: 10,
		durationMs: null,
		allowedHints: ALL_HINTS,
		feedbackTiming: { correctMs: 850, wrongMs: 1400 },
		reward: {
			correctCap: 10,
			completionBonus: 3,
			perfectBonus: 10,
			streak5Bonus: 3,
			streak10Bonus: 7,
			recordBonus: 5,
		},
		recordField: 'bestScore',
		poolSize: 10,
	},
	TIMED_60: {
		id: 'TIMED_60',
		titleRu: '60 секунд',
		descriptionRu: 'Сколько успеешь за минуту',
		icon: '⚡',
		endCondition: 'timed',
		questionCount: null,
		durationMs: 60_000,
		allowedHints: NO_SAVE_STREAK,
		feedbackTiming: { correctMs: 320, wrongMs: 600 },
		reward: {
			correctCap: 10,
			completionBonus: 3,
			perfectBonus: 0,
			streak5Bonus: 3,
			streak10Bonus: 5,
			recordBonus: 5,
		},
		recordField: 'bestScore',
		poolSize: 40,
	},
	NO_MISTAKE: {
		id: 'NO_MISTAKE',
		titleRu: 'Без ошибки',
		descriptionRu: 'Играй до первой ошибки',
		icon: '❤️',
		endCondition: 'until_mistake',
		questionCount: null,
		durationMs: null,
		allowedHints: NO_SAVE_STREAK,
		feedbackTiming: { correctMs: 700, wrongMs: 1100 },
		reward: {
			correctCap: 12,
			completionBonus: 2,
			perfectBonus: 0,
			streak5Bonus: 3,
			streak10Bonus: 7,
			recordBonus: 5,
		},
		recordField: 'bestCorrect',
		poolSize: 40,
	},
	MIXED: {
		id: 'MIXED',
		titleRu: 'Смешанный',
		descriptionRu: '15 вопросов · быстрый случайный микс',
		icon: '🔀',
		endCondition: 'fixed_count',
		questionCount: 15,
		durationMs: null,
		allowedHints: ALL_HINTS,
		feedbackTiming: { correctMs: 680, wrongMs: 1100 },
		reward: {
			correctCap: 15,
			completionBonus: 5,
			perfectBonus: 10,
			streak5Bonus: 3,
			streak10Bonus: 7,
			recordBonus: 5,
		},
		recordField: 'bestScore',
		poolSize: 15,
	},
	WEAK_ELEMENTS: {
		id: 'WEAK_ELEMENTS',
		titleRu: 'Слабые элементы',
		descriptionRu: 'Тренируй то, где ошибаешься чаще всего',
		icon: '🎯',
		endCondition: 'fixed_count',
		questionCount: 10,
		durationMs: null,
		allowedHints: ALL_HINTS,
		feedbackTiming: { correctMs: 850, wrongMs: 1400 },
		reward: {
			correctCap: 10,
			completionBonus: 3,
			perfectBonus: 10,
			streak5Bonus: 3,
			streak10Bonus: 7,
			recordBonus: 5,
		},
		recordField: 'bestScore',
		poolSize: 10,
	},
	/**
	 * Contextual 5Q training for one element from Progress detail.
	 * Intentionally omitted from GAME_MODE_ORDER (not a Modes hub card).
	 */
	ELEMENT_TRAINING: {
		id: 'ELEMENT_TRAINING',
		titleRu: 'Тренировка элемента',
		descriptionRu: '5 вопросов по одному элементу',
		icon: '🔬',
		endCondition: 'fixed_count',
		questionCount: 5,
		durationMs: null,
		allowedHints: ALL_HINTS,
		feedbackTiming: { correctMs: 750, wrongMs: 1200 },
		reward: {
			correctCap: 3,
			completionBonus: 1,
			perfectBonus: 0,
			streak5Bonus: 0,
			streak10Bonus: 0,
			recordBonus: 0,
		},
		recordField: 'bestScore',
		poolSize: 5,
	},
}

/** Modes shown on the Modes screen (excludes contextual ELEMENT_TRAINING). */
export const GAME_MODE_ORDER: readonly GameModeId[] = [
	'CLASSIC',
	'TIMED_60',
	'NO_MISTAKE',
	'MIXED',
	'WEAK_ELEMENTS',
]

export function getGameModeConfig(modeId: GameModeId): GameModeConfig {
	return GAME_MODE_CONFIGS[modeId]
}

export function isHintAllowed(
	modeId: GameModeId,
	hint: (typeof ALL_HINTS)[number],
): boolean {
	return GAME_MODE_CONFIGS[modeId].allowedHints.includes(hint)
}
