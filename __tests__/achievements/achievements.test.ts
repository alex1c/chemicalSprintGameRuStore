import {
	ACHIEVEMENT_DEFINITIONS,
	ACHIEVEMENT_IDS,
	createEmptyAchievementsState,
	evaluateAchievements,
} from '../../src/achievements'
import { createEmptyDailyState } from '../../src/daily'
import { createDefaultModeStatsMap } from '../../src/modes'
import { LEARNING_ARTICLE_IDS, LEARNING_ARTICLES } from '../../src/learning'
import { ONBOARDING_STEPS } from '../../src/onboarding'
import {
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
	migratePersistedState,
	type KeyValueStorage,
} from '../../src/storage'
import {
	loadOnboardingCompleted,
	setOnboardingCompleted,
	markLearningArticleVisited,
	loadLearningVisited,
} from '../../src/stats'
import { DEFAULT_STATISTICS } from '../../src/storage'

class MemoryStorage implements KeyValueStorage {
	private data = new Map<string, string>()
	async getItem(key: string) {
		return this.data.has(key) ? this.data.get(key)! : null
	}
	async setItem(key: string, value: string) {
		this.data.set(key, value)
	}
	async removeItem(key: string) {
		this.data.delete(key)
	}
}

function baseInput(
	overrides: Partial<Parameters<typeof evaluateAchievements>[0]> = {},
) {
	return {
		statistics: { ...DEFAULT_STATISTICS, hintsUsed: { ...DEFAULT_STATISTICS.hintsUsed } },
		elementStats: {},
		modeStats: createDefaultModeStatsMap(),
		daily: createEmptyDailyState(),
		achievements: createEmptyAchievementsState(),
		...overrides,
	}
}

describe('achievements catalog', () => {
	it('has 15 stable unique IDs', () => {
		expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(15)
		expect(new Set(ACHIEVEMENT_IDS).size).toBe(15)
	})
})

describe('achievement evaluation', () => {
	it('unlocks first sprint from classic gamesPlayed', () => {
		const modes = createDefaultModeStatsMap()
		modes.CLASSIC.gamesPlayed = 1
		const result = evaluateAchievements(
			baseInput({ modeStats: modes, nowIso: '2026-09-12T10:00:00.000Z' }),
		)
		expect(result.newlyUnlockedIds).toContain('first_sprint')
		expect(result.nextAchievements.unlocked.first_sprint?.unlockedAt).toBe(
			'2026-09-12T10:00:00.000Z',
		)
	})

	it('unlocks classic perfect from session event', () => {
		const result = evaluateAchievements(
			baseInput({
				event: {
					type: 'SESSION_COMPLETED',
					modeId: 'CLASSIC',
					correctCount: 10,
					wrongCount: 0,
					questionCount: 10,
					bestStreak: 10,
					atomsEarned: 20,
				},
			}),
		)
		expect(result.newlyUnlockedIds).toContain('classic_perfect')
		expect(result.newlyUnlockedIds).toContain('streak_10')
		expect(result.newlyUnlockedIds).toContain('first_atom')
	})

	it('unlocks mastery thresholds from element stats', () => {
		const elementStats: Record<string, {
			shown: number
			correct: number
			wrong: number
			assistedCorrect: number
			lastSeenAt: string | null
		}> = {}
		for (let i = 1; i <= 25; i += 1) {
			elementStats[String(i)] = {
				shown: 5,
				correct: 5,
				wrong: 0,
				assistedCorrect: 0,
				lastSeenAt: null,
			}
		}
		const result = evaluateAchievements(baseInput({ elementStats }))
		expect(result.newlyUnlockedIds).toContain('mastery_10')
		expect(result.newlyUnlockedIds).toContain('mastery_25')
		expect(result.newlyUnlockedIds).not.toContain('mastery_50')
	})

	it('unlocks daily streak achievements from bestStreak', () => {
		const daily = {
			...createEmptyDailyState(),
			bestStreak: 30,
			currentStreak: 2,
		}
		const result = evaluateAchievements(baseInput({ daily }))
		expect(result.newlyUnlockedIds).toEqual(
			expect.arrayContaining(['daily_3', 'daily_7', 'daily_30']),
		)
	})

	it('unlocks hint and no-mistake achievements', () => {
		const statistics = {
			...DEFAULT_STATISTICS,
			hintsUsed: {
				fiftyFifty: 0,
				fact: 10,
				secondChance: 10,
				saveStreak: 0,
				total: 20,
			},
		}
		const modes = createDefaultModeStatsMap()
		modes.NO_MISTAKE.bestCorrect = 20
		const result = evaluateAchievements(
			baseInput({ statistics, modeStats: modes }),
		)
		expect(result.newlyUnlockedIds).toContain('fact_hint_10')
		expect(result.newlyUnlockedIds).toContain('second_chance_10')
		expect(result.newlyUnlockedIds).toContain('no_mistake_20')
	})

	it('is idempotent and keeps unlockedAt stable', () => {
		const modes = createDefaultModeStatsMap()
		modes.CLASSIC.gamesPlayed = 2
		const first = evaluateAchievements(
			baseInput({
				modeStats: modes,
				nowIso: '2026-09-12T10:00:00.000Z',
			}),
		)
		const second = evaluateAchievements(
			baseInput({
				modeStats: modes,
				achievements: first.nextAchievements,
				nowIso: '2026-09-13T10:00:00.000Z',
			}),
		)
		expect(second.newlyUnlockedIds).not.toContain('first_sprint')
		expect(second.nextAchievements.unlocked.first_sprint?.unlockedAt).toBe(
			'2026-09-12T10:00:00.000Z',
		)
	})
})

describe('onboarding persistence', () => {
	it('fresh defaults to onboarding incomplete', () => {
		const fresh = createDefaultPersistedState()
		expect(fresh.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(fresh.onboardingCompleted).toBe(false)
	})

	it('skip/complete persists onboardingCompleted', async () => {
		const memory = new MemoryStorage()
		expect(await loadOnboardingCompleted(memory)).toBe(false)
		await setOnboardingCompleted(true, memory)
		expect(await loadOnboardingCompleted(memory)).toBe(true)
	})

	it('has exactly 3 onboarding steps', () => {
		expect(ONBOARDING_STEPS).toHaveLength(3)
	})
})

describe('learning catalog', () => {
	it('has 8 unique non-empty articles', () => {
		expect(LEARNING_ARTICLES).toHaveLength(8)
		expect(new Set(LEARNING_ARTICLE_IDS).size).toBe(8)
		for (const article of LEARNING_ARTICLES) {
			expect(article.titleRu.length).toBeGreaterThan(0)
			expect(article.paragraphsRu.length).toBeGreaterThanOrEqual(2)
		}
	})

	it('persists visited articles', async () => {
		const memory = new MemoryStorage()
		const visited = await markLearningArticleVisited(
			'what_is_element',
			memory,
		)
		expect(visited).toContain('what_is_element')
		const again = await markLearningArticleVisited('what_is_element', memory)
		expect(again).toHaveLength(1)
		expect(await loadLearningVisited(memory)).toEqual(['what_is_element'])
	})
})

describe('schema v5 migration', () => {
	it('migrates v4 existing profile with onboardingCompleted true', () => {
		const migrated = migratePersistedState({
			schemaVersion: 4,
			atoms: {
				balance: 33,
				lifetimeEarned: 40,
				lifetimeSpent: 7,
				startingGranted: true,
			},
			daily: {
				currentStreak: 2,
				bestStreak: 5,
				lastCompletedDateKey: '2026-09-11',
				history: {
					'2026-09-11': {
						completed: true,
						score: 100,
						correct: 8,
						total: 10,
						bestStreak: 4,
						atomsEarned: 12,
						completedAt: 'x',
						firstCompletionAt: 'x',
						bestScore: 100,
						bestCorrect: 8,
						bestAccuracy: 0.8,
						bonusGranted: true,
					},
				},
			},
			elementStats: {
				'8': {
					shown: 2,
					correct: 1,
					wrong: 1,
					assistedCorrect: 0,
					lastSeenAt: null,
				},
			},
			modeStats: {
				CLASSIC: {
					gamesPlayed: 4,
					bestScore: 120,
					bestCorrect: 10,
					bestStreak: 10,
					bestAccuracy: 1,
				},
			},
			achievements: { unlockedIds: ['legacy'] },
		})
		expect(migrated.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(migrated.onboardingCompleted).toBe(true)
		expect(migrated.learningVisited).toEqual([])
		expect(migrated.achievements.unlocked).toEqual({})
		expect(migrated.atoms.balance).toBe(33)
		expect(migrated.daily.bestStreak).toBe(5)
		expect(migrated.elementStats['8']?.wrong).toBe(1)
		expect(migrated.modeStats.CLASSIC.gamesPlayed).toBe(4)
	})
})
