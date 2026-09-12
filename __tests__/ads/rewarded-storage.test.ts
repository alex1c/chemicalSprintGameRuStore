import {
	REWARDED_ATOM_GRANT,
	REWARDED_DAILY_MAX,
} from '../../src/ads/config'
import {
	grantRewardedAtoms,
	resetRewardedGrantGuardForTests,
} from '../../src/stats'
import {
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
	loadAppState,
	migratePersistedState,
	saveAppState,
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

describe('rewarded grant persistence', () => {
	beforeEach(() => {
		resetRewardedGrantGuardForTests()
	})

	it('grants +10 exactly once per reward id', async () => {
		const memory = new MemoryStorage()
		const first = await grantRewardedAtoms('rw-1', memory)
		expect(first.granted).toBe(true)
		expect(first.atomsGranted).toBe(REWARDED_ATOM_GRANT)

		const dup = await grantRewardedAtoms('rw-1', memory)
		expect(dup.granted).toBe(false)
		expect(dup.reason).toBe('duplicate')

		const loaded = await loadAppState(memory)
		expect(loaded.atoms.balance).toBe(
			createDefaultPersistedState().atoms.balance + REWARDED_ATOM_GRANT,
		)
		expect(loaded.ads.rewardedCompletedToday).toBe(1)
	})

	it('enforces daily max of 3', async () => {
		const memory = new MemoryStorage()
		for (let i = 0; i < REWARDED_DAILY_MAX; i += 1) {
			const result = await grantRewardedAtoms(`rw-day-${i}`, memory)
			expect(result.granted).toBe(true)
		}
		const blocked = await grantRewardedAtoms('rw-day-extra', memory)
		expect(blocked.granted).toBe(false)
		expect(blocked.reason).toBe('limit_reached')
	})
})

describe('ads storage migration v6→v7', () => {
	it('migrates and defaults ads counters', () => {
		const migrated = migratePersistedState({
			schemaVersion: 6,
			settings: { hapticsEnabled: true, locale: 'ru' },
			atoms: { balance: 40, lifetimeEarned: 40, lifetimeSpent: 0, startingGranted: true },
			onboardingCompleted: true,
			learningVisited: ['groups'],
		})
		expect(migrated.schemaVersion).toBe(7)
		expect(migrated.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(migrated.ads.rewardedDateKey).toBeNull()
		expect(migrated.ads.rewardedCompletedToday).toBe(0)
		expect(migrated.ads.completedGamesSinceInterstitial).toBe(0)
		expect(migrated.ads.eligibleGamesCompleted).toBe(0)
		expect(migrated.atoms.balance).toBe(40)
		expect(migrated.onboardingCompleted).toBe(true)
		expect(migrated.learningVisited).toEqual(['groups'])
		expect(migrated.settings.hapticsEnabled).toBe(true)
	})

	it('sanitizes corrupt ads state', () => {
		const state = migratePersistedState({
			schemaVersion: 7,
			ads: {
				rewardedDateKey: 'not-a-date',
				rewardedCompletedToday: -5,
				completedGamesSinceInterstitial: 'many',
				eligibleGamesCompleted: 9999999,
			},
		})
		expect(state.ads.rewardedDateKey).toBeNull()
		expect(state.ads.rewardedCompletedToday).toBe(0)
		expect(state.ads.completedGamesSinceInterstitial).toBe(0)
		expect(state.ads.eligibleGamesCompleted).toBe(100_000)
	})

	it('persists ads state round-trip', async () => {
		const memory = new MemoryStorage()
		const initial = createDefaultPersistedState()
		initial.ads.eligibleGamesCompleted = 4
		initial.ads.completedGamesSinceInterstitial = 4
		await saveAppState(initial, memory)
		const loaded = await loadAppState(memory)
		expect(loaded.ads.eligibleGamesCompleted).toBe(4)
	})
})
