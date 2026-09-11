/**
 * Versioned local persistence schema for future game progress.
 * Keep React components free of raw storage access.
 */

export const STORAGE_SCHEMA_VERSION = 1 as const

export interface AppSettings {
	soundEnabled: boolean
	hapticsEnabled: boolean
	reduceMotion: boolean
	locale: 'ru'
}

export interface AppStatistics {
	gamesPlayed: number
	questionsAnswered: number
	/** Lifetime correct answers across completed games. */
	correctAnswers: number
	/** Lifetime wrong answers across completed games. */
	totalWrong: number
	bestScore: number
	/** Best session accuracy in range [0, 1]. */
	bestAccuracy: number
	bestStreak: number
}

export interface AppProgress {
	/** Placeholder mastery map: atomicNumber -> mastery score 0..100 */
	elementMastery: Record<string, number>
	unlockedModes: string[]
}

export interface AtomsWallet {
	balance: number
	lifetimeEarned: number
}

export interface AchievementsState {
	unlockedIds: string[]
}

export interface DailyState {
	lastDailyDate: string | null
	dailySeed: number | null
	dailyCompleted: boolean
}

/**
 * Root persisted document. Always includes schemaVersion for migrations.
 */
export interface PersistedAppState {
	schemaVersion: typeof STORAGE_SCHEMA_VERSION
	settings: AppSettings
	statistics: AppStatistics
	progress: AppProgress
	atoms: AtomsWallet
	achievements: AchievementsState
	daily: DailyState
	updatedAt: string
}

export const DEFAULT_SETTINGS: AppSettings = {
	soundEnabled: true,
	hapticsEnabled: true,
	reduceMotion: false,
	locale: 'ru',
}

export const DEFAULT_STATISTICS: AppStatistics = {
	gamesPlayed: 0,
	questionsAnswered: 0,
	correctAnswers: 0,
	totalWrong: 0,
	bestScore: 0,
	bestAccuracy: 0,
	bestStreak: 0,
}

export const DEFAULT_PROGRESS: AppProgress = {
	elementMastery: {},
	unlockedModes: ['classic'],
}

export const DEFAULT_ATOMS: AtomsWallet = {
	balance: 0,
	lifetimeEarned: 0,
}

export const DEFAULT_ACHIEVEMENTS: AchievementsState = {
	unlockedIds: [],
}

export const DEFAULT_DAILY: DailyState = {
	lastDailyDate: null,
	dailySeed: null,
	dailyCompleted: false,
}

export function createDefaultPersistedState(
	now: () => Date = () => new Date(),
): PersistedAppState {
	return {
		schemaVersion: STORAGE_SCHEMA_VERSION,
		settings: { ...DEFAULT_SETTINGS },
		statistics: { ...DEFAULT_STATISTICS },
		progress: {
			elementMastery: {},
			unlockedModes: [...DEFAULT_PROGRESS.unlockedModes],
		},
		atoms: { ...DEFAULT_ATOMS },
		achievements: { unlockedIds: [] },
		daily: { ...DEFAULT_DAILY },
		updatedAt: now().toISOString(),
	}
}
