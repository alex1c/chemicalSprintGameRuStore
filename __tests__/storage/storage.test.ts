import {
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
	migratePersistedState,
	loadAppState,
	saveAppState,
	clearAppState,
	type KeyValueStorage,
} from '../../src/storage'

class MemoryStorage implements KeyValueStorage {
	private readonly map = new Map<string, string>()

	async getItem(key: string): Promise<string | null> {
		return this.map.has(key) ? this.map.get(key)! : null
	}

	async setItem(key: string, value: string): Promise<void> {
		this.map.set(key, value)
	}

	async removeItem(key: string): Promise<void> {
		this.map.delete(key)
	}
}

describe('storage foundation', () => {
	it('creates versioned default state', () => {
		const state = createDefaultPersistedState()
		expect(state.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(state.settings.locale).toBe('ru')
		expect(state.atoms.balance).toBe(0)
		expect(state.progress.unlockedModes).toContain('classic')
	})

	it('migrates empty/corrupt payloads to defaults', () => {
		expect(migratePersistedState(null).schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(migratePersistedState('bad').schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
	})

	it('round-trips through the storage abstraction', async () => {
		const memory = new MemoryStorage()
		const initial = createDefaultPersistedState()
		initial.statistics.gamesPlayed = 3
		await saveAppState(initial, memory)

		const loaded = await loadAppState(memory)
		expect(loaded.statistics.gamesPlayed).toBe(3)
		expect(loaded.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)

		await clearAppState(memory)
		const reset = await loadAppState(memory)
		expect(reset.statistics.gamesPlayed).toBe(0)
	})
})
