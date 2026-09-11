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

	return {
		schemaVersion: STORAGE_SCHEMA_VERSION,
		settings: {
			...defaults.settings,
			...(typeof doc.settings === 'object' && doc.settings
				? (doc.settings as object)
				: {}),
		},
		statistics: {
			...defaults.statistics,
			...(typeof doc.statistics === 'object' && doc.statistics
				? (doc.statistics as object)
				: {}),
		},
		progress: {
			...defaults.progress,
			...(typeof doc.progress === 'object' && doc.progress
				? (doc.progress as object)
				: {}),
			elementMastery:
				typeof doc.progress === 'object' &&
				doc.progress &&
				typeof (doc.progress as PersistedAppState['progress']).elementMastery ===
					'object'
					? {
							...(doc.progress as PersistedAppState['progress']).elementMastery,
						}
					: {},
			unlockedModes:
				typeof doc.progress === 'object' &&
				doc.progress &&
				Array.isArray((doc.progress as PersistedAppState['progress']).unlockedModes)
					? [...(doc.progress as PersistedAppState['progress']).unlockedModes]
					: [...defaults.progress.unlockedModes],
		},
		atoms: {
			...defaults.atoms,
			...(typeof doc.atoms === 'object' && doc.atoms ? (doc.atoms as object) : {}),
		},
		achievements: {
			unlockedIds:
				typeof doc.achievements === 'object' &&
				doc.achievements &&
				Array.isArray(
					(doc.achievements as PersistedAppState['achievements']).unlockedIds,
				)
					? [
							...(doc.achievements as PersistedAppState['achievements'])
								.unlockedIds,
						]
					: [],
		},
		daily: {
			...defaults.daily,
			...(typeof doc.daily === 'object' && doc.daily ? (doc.daily as object) : {}),
		},
		updatedAt:
			typeof doc.updatedAt === 'string' ? doc.updatedAt : defaults.updatedAt,
	}
}
