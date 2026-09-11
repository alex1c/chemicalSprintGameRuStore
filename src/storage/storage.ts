import AsyncStorage from '@react-native-async-storage/async-storage'
import { migratePersistedState } from './migrations'
import {
	createDefaultPersistedState,
	type PersistedAppState,
} from './schema'

export const STORAGE_KEY = 'chemical-sprint/app-state/v1'

export interface KeyValueStorage {
	getItem(key: string): Promise<string | null>
	setItem(key: string, value: string): Promise<void>
	removeItem(key: string): Promise<void>
}

/**
 * Load persisted app state, migrating schema when needed.
 */
export async function loadAppState(
	storage: KeyValueStorage = AsyncStorage,
): Promise<PersistedAppState> {
	try {
		const raw = await storage.getItem(STORAGE_KEY)
		if (!raw) {
			return createDefaultPersistedState()
		}
		const parsed: unknown = JSON.parse(raw)
		return migratePersistedState(parsed)
	} catch {
		return createDefaultPersistedState()
	}
}

/**
 * Persist the full app state document.
 */
export async function saveAppState(
	state: PersistedAppState,
	storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
	const payload: PersistedAppState = {
		...state,
		updatedAt: new Date().toISOString(),
	}
	await storage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

/**
 * Reset local progress to defaults (settings may be preserved by callers later).
 */
export async function clearAppState(
	storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
	await storage.removeItem(STORAGE_KEY)
}
