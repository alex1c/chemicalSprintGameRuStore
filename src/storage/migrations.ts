import {
	createDefaultPersistedState,
	STORAGE_SCHEMA_VERSION,
	type PersistedAppState,
} from './schema'

export type Migration = (
	raw: Record<string, unknown>,
) => Record<string, unknown>

/**
 * Ordered migrations from older schema versions to the current one.
 * Add a new entry whenever STORAGE_SCHEMA_VERSION increments.
 */
export const MIGRATIONS: Record<number, Migration> = {
	// Example future migration:
	// 2: (raw) => ({ ...raw, schemaVersion: 2, atoms: raw.atoms ?? default }),
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

function stringArrayOr(value: unknown, fallback: string[]): string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string')
		? [...value]
		: [...fallback]
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

	for (let version = incomingVersion + 1; version <= STORAGE_SCHEMA_VERSION; version += 1) {
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

	return {
		schemaVersion: STORAGE_SCHEMA_VERSION,
		settings: {
			...defaults.settings,
			soundEnabled: booleanOr(settings.soundEnabled, defaults.settings.soundEnabled),
			hapticsEnabled: booleanOr(settings.hapticsEnabled, defaults.settings.hapticsEnabled),
			reduceMotion: booleanOr(settings.reduceMotion, defaults.settings.reduceMotion),
			locale: settings.locale === 'ru' ? 'ru' : defaults.settings.locale,
		},
		statistics: {
			...defaults.statistics,
			gamesPlayed: nonNegativeNumberOr(statistics.gamesPlayed, defaults.statistics.gamesPlayed),
			questionsAnswered: nonNegativeNumberOr(statistics.questionsAnswered, defaults.statistics.questionsAnswered),
			correctAnswers: nonNegativeNumberOr(statistics.correctAnswers, defaults.statistics.correctAnswers),
			bestScore: nonNegativeNumberOr(statistics.bestScore, defaults.statistics.bestScore),
			bestStreak: nonNegativeNumberOr(statistics.bestStreak, defaults.statistics.bestStreak),
		},
		progress: {
			...defaults.progress,
			unlockedModes: stringArrayOr(progress.unlockedModes, defaults.progress.unlockedModes),
			elementMastery:
			isRecord(progress.elementMastery)
				? Object.entries(progress.elementMastery).reduce<Record<string, number>>(
					(result, [key, value]) => {
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
					},
					{},
				)
				: {},
		},
		atoms: {
			...defaults.atoms,
			balance: nonNegativeNumberOr(atoms.balance, defaults.atoms.balance),
			lifetimeEarned: nonNegativeNumberOr(atoms.lifetimeEarned, defaults.atoms.lifetimeEarned),
		},
		achievements: {
			unlockedIds:
				stringArrayOr(achievements.unlockedIds, defaults.achievements.unlockedIds),
		},
		daily: {
			...defaults.daily,
			lastDailyDate:
				typeof daily.lastDailyDate === 'string' || daily.lastDailyDate === null
					? daily.lastDailyDate
					: defaults.daily.lastDailyDate,
			dailySeed:
				typeof daily.dailySeed === 'number' && Number.isFinite(daily.dailySeed)
					? daily.dailySeed
					: defaults.daily.dailySeed,
			dailyCompleted: booleanOr(daily.dailyCompleted, defaults.daily.dailyCompleted),
		},
		updatedAt:
			typeof doc.updatedAt === 'string' ? doc.updatedAt : defaults.updatedAt,
	}
}
