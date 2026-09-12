import { ATOM_ECONOMY_CONFIG } from '../economy/config'
import {
	createDefaultModeStatsMap,
	type ElementPerformance,
	type ElementStatsMap,
	type GameModeId,
	type ModeStats,
	type ModeStatsMap,
} from '../modes'
import {
	createDefaultPersistedState,
	DEFAULT_HINT_USAGE,
	STORAGE_SCHEMA_VERSION,
	type HintUsageStats,
	type PersistedAppState,
} from './schema'

export type Migration = (
	raw: Record<string, unknown>,
) => Record<string, unknown>

/**
 * Ordered migrations from older schema versions to the current one.
 */
export const MIGRATIONS: Record<number, Migration> = {
	/**
	 * v2: atom economy + hint stats.
	 * Grants startingAtoms exactly once for legacy installs.
	 */
	2: (raw) => {
		const previousAtoms = isRecord(raw.atoms) ? raw.atoms : {}
		const previousBalance = nonNegativeNumberOr(previousAtoms.balance, 0)
		const previousEarned = nonNegativeNumberOr(
			previousAtoms.lifetimeEarned,
			previousBalance,
		)
		const alreadyGranted = previousAtoms.startingGranted === true

		const starting = ATOM_ECONOMY_CONFIG.startingAtoms
		const shouldGrant = !alreadyGranted

		const balance = shouldGrant
			? previousBalance + starting
			: previousBalance
		const lifetimeEarned = shouldGrant
			? previousEarned + starting
			: previousEarned

		const previousStats = isRecord(raw.statistics) ? raw.statistics : {}

		return {
			...raw,
			schemaVersion: 2,
			atoms: {
				balance,
				lifetimeEarned,
				lifetimeSpent: nonNegativeNumberOr(previousAtoms.lifetimeSpent, 0),
				startingGranted: true,
			},
			statistics: {
				...previousStats,
				totalAtomsEarned: nonNegativeNumberOr(
					previousStats.totalAtomsEarned,
					lifetimeEarned,
				),
				totalAtomsSpent: nonNegativeNumberOr(
					previousStats.totalAtomsSpent,
					0,
				),
				hintsUsed: sanitizeHintUsage(previousStats.hintsUsed),
			},
		}
	},
	/**
	 * v3: element performance + per-mode records for multi-mode play.
	 */
	3: (raw) => ({
		...raw,
		schemaVersion: 3,
		elementStats: isRecord(raw.elementStats) ? raw.elementStats : {},
		modeStats: isRecord(raw.modeStats)
			? raw.modeStats
			: createDefaultModeStatsMap(),
		progress: {
			...(isRecord(raw.progress) ? raw.progress : {}),
			unlockedModes: [
				'CLASSIC',
				'TIMED_60',
				'NO_MISTAKE',
				'MIXED',
				'WEAK_ELEMENTS',
			],
		},
	}),
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function booleanOr(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback
}

function nonNegativeNumberOr(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? value
		: fallback
}

/** Clamp accuracy-like values into [0, 1], falling back when invalid. */
function clampUnitInterval(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return fallback
	}
	if (value < 0) {
		return 0
	}
	if (value > 1) {
		return 1
	}
	return value
}

function sanitizeHintUsage(value: unknown): HintUsageStats {
	const record = isRecord(value) ? value : {}
	const fiftyFifty = nonNegativeNumberOr(record.fiftyFifty, 0)
	const fact = nonNegativeNumberOr(record.fact, 0)
	const secondChance = nonNegativeNumberOr(record.secondChance, 0)
	const saveStreak = nonNegativeNumberOr(record.saveStreak, 0)
	const total = nonNegativeNumberOr(
		record.total,
		fiftyFifty + fact + secondChance + saveStreak,
	)
	return {
		fiftyFifty,
		fact,
		secondChance,
		saveStreak,
		total,
	}
}

/**
 * Migrate an unknown stored payload to the current schema version.
 * Falls back to defaults when the payload is corrupt or unusable.
 */
export function migratePersistedState(raw: unknown): PersistedAppState {
	const fallback = createDefaultPersistedState()

	if (!raw || typeof raw !== 'object') {
		return fallback
	}

	let doc = { ...(raw as Record<string, unknown>) }
	const incomingVersion =
		typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 0

	if (incomingVersion > STORAGE_SCHEMA_VERSION) {
		// Newer payload than this app build understands — keep safe defaults.
		return fallback
	}

	for (
		let version = incomingVersion + 1;
		version <= STORAGE_SCHEMA_VERSION;
		version += 1
	) {
		const migrate = MIGRATIONS[version]
		if (migrate) {
			doc = migrate(doc)
		}
		doc.schemaVersion = version
	}

	const defaults = createDefaultPersistedState()

	const settings = isRecord(doc.settings) ? doc.settings : {}
	const statistics = isRecord(doc.statistics) ? doc.statistics : {}
	const progress = isRecord(doc.progress) ? doc.progress : {}
	const atoms = isRecord(doc.atoms) ? doc.atoms : {}
	const achievements = isRecord(doc.achievements) ? doc.achievements : {}
	const daily = isRecord(doc.daily) ? doc.daily : {}
	const completedSessionIds = stringArrayOr(doc.completedSessionIds, [])

	const sanitizedAtomsBalance = nonNegativeNumberOr(
		atoms.balance,
		defaults.atoms.balance,
	)
	const sanitizedLifetimeEarned = nonNegativeNumberOr(
		atoms.lifetimeEarned,
		defaults.atoms.lifetimeEarned,
	)
	const sanitizedLifetimeSpent = nonNegativeNumberOr(
		atoms.lifetimeSpent,
		defaults.atoms.lifetimeSpent,
	)
	const startingGranted = booleanOr(
		atoms.startingGranted,
		defaults.atoms.startingGranted,
	)

	return {
		schemaVersion: STORAGE_SCHEMA_VERSION,
		settings: {
			...defaults.settings,
			soundEnabled: booleanOr(
				settings.soundEnabled,
				defaults.settings.soundEnabled,
			),
			hapticsEnabled: booleanOr(
				settings.hapticsEnabled,
				defaults.settings.hapticsEnabled,
			),
			reduceMotion: booleanOr(
				settings.reduceMotion,
				defaults.settings.reduceMotion,
			),
			locale: settings.locale === 'ru' ? 'ru' : defaults.settings.locale,
		},
		statistics: {
			...defaults.statistics,
			gamesPlayed: nonNegativeNumberOr(
				statistics.gamesPlayed,
				defaults.statistics.gamesPlayed,
			),
			questionsAnswered: nonNegativeNumberOr(
				statistics.questionsAnswered,
				defaults.statistics.questionsAnswered,
			),
			correctAnswers: nonNegativeNumberOr(
				statistics.correctAnswers,
				defaults.statistics.correctAnswers,
			),
			totalWrong: nonNegativeNumberOr(
				statistics.totalWrong,
				defaults.statistics.totalWrong,
			),
			bestScore: nonNegativeNumberOr(
				statistics.bestScore,
				defaults.statistics.bestScore,
			),
			bestAccuracy: clampUnitInterval(
				statistics.bestAccuracy,
				defaults.statistics.bestAccuracy,
			),
			bestStreak: nonNegativeNumberOr(
				statistics.bestStreak,
				defaults.statistics.bestStreak,
			),
			totalAtomsEarned: nonNegativeNumberOr(
				statistics.totalAtomsEarned,
				sanitizedLifetimeEarned,
			),
			totalAtomsSpent: nonNegativeNumberOr(
				statistics.totalAtomsSpent,
				sanitizedLifetimeSpent,
			),
			hintsUsed: sanitizeHintUsage(statistics.hintsUsed) ?? {
				...DEFAULT_HINT_USAGE,
			},
		},
		progress: {
			...defaults.progress,
			unlockedModes: stringArrayOr(
				progress.unlockedModes,
				defaults.progress.unlockedModes,
			),
			elementMastery: isRecord(progress.elementMastery)
				? Object.entries(progress.elementMastery).reduce<
						Record<string, number>
					>((result, [key, value]) => {
						if (
							/^\d+$/.test(key) &&
							typeof value === 'number' &&
							Number.isFinite(value) &&
							value >= 0 &&
							value <= 100
						) {
							result[key] = value
						}
						return result
					}, {})
				: {},
		},
		atoms: {
			balance: sanitizedAtomsBalance,
			lifetimeEarned: sanitizedLifetimeEarned,
			lifetimeSpent: sanitizedLifetimeSpent,
			startingGranted,
		},
		achievements: {
			unlockedIds: stringArrayOr(
				achievements.unlockedIds,
				defaults.achievements.unlockedIds,
			),
		},
		daily: {
			...defaults.daily,
			lastDailyDate:
				typeof daily.lastDailyDate === 'string' ||
				daily.lastDailyDate === null
					? daily.lastDailyDate
					: defaults.daily.lastDailyDate,
			dailySeed:
				typeof daily.dailySeed === 'number' &&
				Number.isFinite(daily.dailySeed)
					? daily.dailySeed
					: defaults.daily.dailySeed,
			dailyCompleted: booleanOr(
				daily.dailyCompleted,
				defaults.daily.dailyCompleted,
			),
		},
		elementStats: sanitizeElementStats(doc.elementStats),
		modeStats: sanitizeModeStats(doc.modeStats),
		completedSessionIds,
		updatedAt:
			typeof doc.updatedAt === 'string' ? doc.updatedAt : defaults.updatedAt,
	}
}

function sanitizeElementStats(value: unknown): ElementStatsMap {
	if (!isRecord(value)) {
		return {}
	}
	const result: ElementStatsMap = {}
	for (const [key, rawStats] of Object.entries(value)) {
		if (!/^\d+$/.test(key) || !isRecord(rawStats)) {
			continue
		}
		const atomic = Number(key)
		if (atomic < 1 || atomic > 118) {
			continue
		}
		const performance: ElementPerformance = {
			shown: nonNegativeNumberOr(rawStats.shown, 0),
			correct: nonNegativeNumberOr(rawStats.correct, 0),
			wrong: nonNegativeNumberOr(rawStats.wrong, 0),
			assistedCorrect: nonNegativeNumberOr(rawStats.assistedCorrect, 0),
			lastSeenAt:
				typeof rawStats.lastSeenAt === 'string' || rawStats.lastSeenAt === null
					? (rawStats.lastSeenAt as string | null)
					: null,
		}
		result[key] = performance
	}
	return result
}

function sanitizeModeStats(value: unknown): ModeStatsMap {
	const defaults = createDefaultModeStatsMap()
	if (!isRecord(value)) {
		return defaults
	}
	const modeIds: GameModeId[] = [
		'CLASSIC',
		'TIMED_60',
		'NO_MISTAKE',
		'MIXED',
		'WEAK_ELEMENTS',
		'ELEMENT_TRAINING',
	]
	const result = { ...defaults }
	for (const modeId of modeIds) {
		const raw = value[modeId]
		if (!isRecord(raw)) {
			continue
		}
		const stats: ModeStats = {
			gamesPlayed: nonNegativeNumberOr(raw.gamesPlayed, 0),
			bestScore: nonNegativeNumberOr(raw.bestScore, 0),
			bestCorrect: nonNegativeNumberOr(raw.bestCorrect, 0),
			bestStreak: nonNegativeNumberOr(raw.bestStreak, 0),
			bestAccuracy: clampUnitInterval(raw.bestAccuracy, 0),
		}
		result[modeId] = stats
	}
	return result
}

function stringArrayOr(value: unknown, fallback: string[]): string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string')
		? [...value]
		: [...fallback]
}
