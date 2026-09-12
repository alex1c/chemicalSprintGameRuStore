import {
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
	migratePersistedState,
	loadAppState,
	saveAppState,
	clearAppState,
	type KeyValueStorage,
} from '../../src/storage'
import { ATOM_ECONOMY_CONFIG } from '../../src/economy'

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
	it('creates versioned default state with starting atoms', () => {
		const state = createDefaultPersistedState()
		expect(state.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(state.settings.locale).toBe('ru')
		expect(state.atoms.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
		expect(state.atoms.startingGranted).toBe(true)
		expect(state.progress.unlockedModes).toContain('CLASSIC')
		expect(state.elementStats).toEqual({})
		expect(state.modeStats.CLASSIC.gamesPlayed).toBe(0)
	})

	it('migrates empty/corrupt payloads to defaults', () => {
		expect(migratePersistedState(null).schemaVersion).toBe(
			STORAGE_SCHEMA_VERSION,
		)
		expect(migratePersistedState('bad').schemaVersion).toBe(
			STORAGE_SCHEMA_VERSION,
		)
	})

	it('sanitizes partially corrupt nested state', () => {
		const state = migratePersistedState({
			schemaVersion: 1,
			settings: { soundEnabled: 'yes', hapticsEnabled: false },
			statistics: { gamesPlayed: -1, bestScore: 'many' },
			progress: {
				elementMastery: { '6': 80, '8': 101, bad: 50 },
				unlockedModes: ['classic', 42],
			},
			atoms: { balance: null },
			achievements: { unlockedIds: ['first', false] },
			daily: { dailyCompleted: 'done' },
		})

		expect(state.settings.soundEnabled).toBe(true)
		expect(state.settings.hapticsEnabled).toBe(false)
		expect(state.statistics.gamesPlayed).toBe(0)
		expect(state.statistics.bestScore).toBe(0)
		expect(state.progress.elementMastery).toEqual({ '6': 80 })
		// v3 migration unlocks all PHASE 5 modes for existing installs.
		expect(state.progress.unlockedModes).toEqual([
			'CLASSIC',
			'TIMED_60',
			'NO_MISTAKE',
			'MIXED',
			'WEAK_ELEMENTS',
		])
		expect(state.achievements.unlocked).toEqual({})
		expect(state.daily.currentStreak).toBe(0)
		expect(state.daily.history).toEqual({})
		expect(state.atoms.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
		expect(state.schemaVersion).toBe(5)
		expect(state.onboardingCompleted).toBe(true)
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
		expect(reset.atoms.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
	})
})
