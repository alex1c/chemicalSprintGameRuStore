export {
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
	DEFAULT_SETTINGS,
	DEFAULT_STATISTICS,
	DEFAULT_PROGRESS,
	DEFAULT_ATOMS,
	DEFAULT_ACHIEVEMENTS,
	DEFAULT_DAILY,
} from './schema'

export type {
	PersistedAppState,
	AppSettings,
	AppStatistics,
	AppProgress,
	AtomsWallet,
	AchievementsState,
	DailyState,
} from './schema'

export { migratePersistedState, MIGRATIONS } from './migrations'

export {
	STORAGE_KEY,
	loadAppState,
	saveAppState,
	clearAppState,
} from './storage'

export type { KeyValueStorage } from './storage'
