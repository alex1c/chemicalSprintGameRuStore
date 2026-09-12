/**
 * Versioned local persistence schema for future game progress.
 * Keep React components free of raw storage access.
 */

import {
	createEmptyAchievementsState,
	type AchievementsPersistedState,
} from '../achievements'
import { ATOM_ECONOMY_CONFIG } from '../economy/config'
import {
	createEmptyDailyState,
	type DailyStateV4,
} from '../daily'
import {
	createDefaultModeStatsMap,
	type ElementStatsMap,
	type ModeStatsMap,
} from '../modes'

export const STORAGE_SCHEMA_VERSION = 6 as const

export interface AppSettings {
	soundEnabled: boolean
	hapticsEnabled: boolean
	reduceMotion: boolean
	locale: 'ru'
}

export interface HintUsageStats {
	fiftyFifty: number
	fact: number
	secondChance: number
	saveStreak: number
	total: number
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
	/** Lifetime atoms earned (including starting grant). */
	totalAtomsEarned: number
	/** Lifetime atoms spent on hints. */
	totalAtomsSpent: number
	hintsUsed: HintUsageStats
}

export interface AppProgress {
	/** Placeholder mastery map: atomicNumber -> mastery score 0..100 */
	elementMastery: Record<string, number>
	unlockedModes: string[]
}

export interface AtomsWallet {
	balance: number
	lifetimeEarned: number
	lifetimeSpent: number
	/** Ensures startingAtoms are granted only once. */
	startingGranted: boolean
}

export type DailyState = DailyStateV4

/** Achievement unlock map with timestamps. */
export type AchievementsState = AchievementsPersistedState

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
	/** Per-element answer performance for Weak Elements mode. */
	elementStats: ElementStatsMap
	/** Per-mode personal records. */
	modeStats: ModeStatsMap
	/** Completed session ids make reward/stat commits durable and idempotent. */
	completedSessionIds: string[]
	/** First-run onboarding finished or skipped. */
	onboardingCompleted: boolean
	/** Learning article ids the user has opened. */
	learningVisited: string[]
	updatedAt: string
}

export const DEFAULT_SETTINGS: AppSettings = {
	soundEnabled: true,
	hapticsEnabled: true,
	reduceMotion: false,
	locale: 'ru',
}

export const DEFAULT_HINT_USAGE: HintUsageStats = {
	fiftyFifty: 0,
	fact: 0,
	secondChance: 0,
	saveStreak: 0,
	total: 0,
}

export const DEFAULT_STATISTICS: AppStatistics = {
	gamesPlayed: 0,
	questionsAnswered: 0,
	correctAnswers: 0,
	totalWrong: 0,
	bestScore: 0,
	bestAccuracy: 0,
	bestStreak: 0,
	totalAtomsEarned: ATOM_ECONOMY_CONFIG.startingAtoms,
	totalAtomsSpent: 0,
	hintsUsed: { ...DEFAULT_HINT_USAGE },
}

export const DEFAULT_PROGRESS: AppProgress = {
	elementMastery: {},
	unlockedModes: [
		'CLASSIC',
		'TIMED_60',
		'NO_MISTAKE',
		'MIXED',
		'WEAK_ELEMENTS',
	],
}

/** Fresh installs receive the starting wallet grant immediately. */
export const DEFAULT_ATOMS: AtomsWallet = {
	balance: ATOM_ECONOMY_CONFIG.startingAtoms,
	lifetimeEarned: ATOM_ECONOMY_CONFIG.startingAtoms,
	lifetimeSpent: 0,
	startingGranted: true,
}

export const DEFAULT_ACHIEVEMENTS: AchievementsState =
	createEmptyAchievementsState()

export const DEFAULT_DAILY: DailyState = createEmptyDailyState()

export function createDefaultPersistedState(
	now: () => Date = () => new Date(),
): PersistedAppState {
	return {
		schemaVersion: STORAGE_SCHEMA_VERSION,
		settings: { ...DEFAULT_SETTINGS },
		statistics: {
			...DEFAULT_STATISTICS,
			hintsUsed: { ...DEFAULT_HINT_USAGE },
		},
		progress: {
			elementMastery: {},
			unlockedModes: [...DEFAULT_PROGRESS.unlockedModes],
		},
		atoms: { ...DEFAULT_ATOMS },
		achievements: createEmptyAchievementsState(),
		daily: { ...DEFAULT_DAILY },
		elementStats: {},
		modeStats: createDefaultModeStatsMap(),
		completedSessionIds: [],
		onboardingCompleted: false,
		learningVisited: [],
		updatedAt: now().toISOString(),
	}
}
