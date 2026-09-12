import {
	DAILY_COMPLETION_BONUS,
	DAILY_GENERATION_VERSION,
	DAILY_QUESTION_COUNT,
	applyDailyCompletion,
	createDailyChallenge,
	createDailySeed,
	createEmptyDailyState,
	differenceInLocalCalendarDays,
	getDailyStreakUpdate,
	getLocalDateKey,
	getPreviousDateKey,
	isValidCalendarDay,
	isValidDateKey,
	parseLocalDateKey,
} from '../../src/daily'
import {
	answerCurrentQuestion,
	createModeSession,
} from '../../src/game'
import { persistCompletedSessionStats } from '../../src/stats'
import {
	STORAGE_SCHEMA_VERSION,
	loadAppState,
	migratePersistedState,
	type KeyValueStorage,
} from '../../src/storage'

class MemoryStorage implements KeyValueStorage {
	private data = new Map<string, string>()

	async getItem(key: string): Promise<string | null> {
		return this.data.has(key) ? this.data.get(key)! : null
	}

	async setItem(key: string, value: string): Promise<void> {
		this.data.set(key, value)
	}

	async removeItem(key: string): Promise<void> {
		this.data.delete(key)
	}
}

describe('daily date helpers', () => {
	it('formats local date keys from constructed local Dates', () => {
		const date = new Date(2026, 8, 12, 15, 30, 0)
		expect(getLocalDateKey(date)).toBe('2026-09-12')
	})

	it('validates calendar days and rejects impossible dates', () => {
		expect(isValidDateKey('2026-09-12')).toBe(true)
		expect(isValidDateKey('2026-99-99')).toBe(false)
		expect(isValidCalendarDay(2026, 2, 30)).toBe(false)
		expect(parseLocalDateKey('2026-02-28')).toEqual({
			year: 2026,
			month: 2,
			day: 28,
		})
	})

	it('computes calendar differences across month and year boundaries', () => {
		expect(differenceInLocalCalendarDays('2026-03-01', '2026-02-28')).toBe(1)
		expect(differenceInLocalCalendarDays('2026-01-01', '2025-12-31')).toBe(1)
		expect(differenceInLocalCalendarDays('2026-09-12', '2026-09-10')).toBe(2)
		expect(getPreviousDateKey('2026-03-01')).toBe('2026-02-28')
		expect(getPreviousDateKey('2026-01-01')).toBe('2025-12-31')
	})
})

describe('daily generation', () => {
	it('is deterministic for the same date and includes generation version', () => {
		const seedA = createDailySeed('2026-09-12')
		const seedB = createDailySeed('2026-09-12')
		const seedC = createDailySeed('2026-09-13')
		expect(seedA).toBe(seedB)
		expect(seedA).not.toBe(seedC)
		expect(DAILY_GENERATION_VERSION).toBe(1)

		const a = createDailyChallenge('2026-09-12')
		const b = createDailyChallenge('2026-09-12')
		expect(a.questions).toHaveLength(DAILY_QUESTION_COUNT)
		expect(a.questions.map((q) => q.id.replace(/-\d+$/, ''))).toEqual(
			b.questions.map((q) => q.id.replace(/-\d+$/, '')),
		)
		expect(a.questions.map((q) => q.type)).toEqual(
			b.questions.map((q) => q.type),
		)
		expect(a.questions.map((q) => q.correctAnswer)).toEqual(
			b.questions.map((q) => q.correctAnswer),
		)
		expect(a.questions.map((q) => q.choices)).toEqual(
			b.questions.map((q) => q.choices),
		)
	})

	it('uses 10 unique elements and a balanced type mix', () => {
		const challenge = createDailyChallenge('2026-09-12')
		const atomic = challenge.questions.map((q) => q.elementAtomicNumber)
		expect(new Set(atomic).size).toBe(10)
		const types = new Set(challenge.questions.map((q) => q.type))
		expect(types.size).toBeGreaterThanOrEqual(5)
		for (let i = 1; i < atomic.length; i += 1) {
			expect(atomic[i]).not.toBe(atomic[i - 1])
		}
	})

	it('createModeSession DAILY binds challengeDateKey', () => {
		const session = createModeSession('DAILY', {
			dailyDateKey: '2026-09-12',
			sessionId: 'daily-test-1',
		})!
		expect(session.challengeDateKey).toBe('2026-09-12')
		expect(session.questions).toHaveLength(10)
		expect(session.modeId).toBe('DAILY')
	})
})

describe('daily streak', () => {
	it('increments across consecutive days and resets after a skip', () => {
		let state = createEmptyDailyState()
		const day1 = applyDailyCompletion(state, {
			dateKey: '2026-09-10',
			score: 100,
			correct: 8,
			total: 10,
			bestStreak: 4,
			accuracy: 0.8,
			atomsEarned: 15,
			bonusGranted: true,
			completedAt: '2026-09-10T12:00:00.000Z',
		})
		expect(day1.currentStreak).toBe(1)
		state = day1.state

		const day2 = applyDailyCompletion(state, {
			dateKey: '2026-09-11',
			score: 120,
			correct: 9,
			total: 10,
			bestStreak: 5,
			accuracy: 0.9,
			atomsEarned: 16,
			bonusGranted: true,
			completedAt: '2026-09-11T12:00:00.000Z',
		})
		expect(day2.currentStreak).toBe(2)
		expect(day2.streakGrew).toBe(true)
		state = day2.state

		const replay = applyDailyCompletion(state, {
			dateKey: '2026-09-11',
			score: 140,
			correct: 10,
			total: 10,
			bestStreak: 10,
			accuracy: 1,
			atomsEarned: 0,
			bonusGranted: false,
			completedAt: '2026-09-11T18:00:00.000Z',
		})
		expect(replay.isFirstCompletion).toBe(false)
		expect(replay.currentStreak).toBe(2)
		expect(replay.state.history['2026-09-11']!.bestScore).toBe(140)
		state = replay.state

		const afterSkip = applyDailyCompletion(state, {
			dateKey: '2026-09-13',
			score: 80,
			correct: 7,
			total: 10,
			bestStreak: 3,
			accuracy: 0.7,
			atomsEarned: 12,
			bonusGranted: true,
			completedAt: '2026-09-13T12:00:00.000Z',
		})
		expect(afterSkip.currentStreak).toBe(1)
		expect(afterSkip.newStreakStarted).toBe(true)
		expect(afterSkip.state.bestStreak).toBe(2)
	})

	it('treats month/year boundaries as consecutive calendar days', () => {
		const state = {
			...createEmptyDailyState(),
			currentStreak: 3,
			bestStreak: 3,
			lastCompletedDateKey: '2025-12-31',
		}
		const update = getDailyStreakUpdate(state, '2026-01-01')
		expect(update.currentStreak).toBe(4)
		expect(update.streakGrew).toBe(true)
	})
})

describe('daily persistence and anti-farm', () => {
	async function playDaily(
		storage: MemoryStorage,
		dateKey: string,
		sessionId: string,
		wrongLast = false,
	) {
		let session = createModeSession('DAILY', {
			dailyDateKey: dateKey,
			sessionId,
		})!
		for (let i = 0; i < session.questions.length; i += 1) {
			const q = session.questions[i]!
			const answer =
				wrongLast && i === session.questions.length - 1
					? (q.choices.find((c) => c !== q.correctAnswer) ?? 'x')
					: q.correctAnswer
			session = answerCurrentQuestion(session, answer)
		}
		return persistCompletedSessionStats(session, storage)
	}

	it('grants bonus once and blocks replay farming', async () => {
		const memory = new MemoryStorage()
		const first = await playDaily(memory, '2026-09-12', 'd1')
		expect(first.isDailyFirstCompletion).toBe(true)
		expect(first.dailyBonusGranted).toBe(DAILY_COMPLETION_BONUS)
		expect(first.atomsEarned).toBeGreaterThanOrEqual(DAILY_COMPLETION_BONUS)
		expect(first.dailyCurrentStreak).toBe(1)

		const atomsAfterFirst = first.atomBalance
		let totalReplayAtoms = 0
		for (let i = 0; i < 10; i += 1) {
			const replay = await playDaily(memory, '2026-09-12', `d-replay-${i}`)
			expect(replay.isDailyReplay).toBe(true)
			expect(replay.dailyBonusGranted).toBe(0)
			expect(replay.atomsEarned).toBe(0)
			expect(replay.dailyCurrentStreak).toBe(1)
			totalReplayAtoms += replay.atomsEarned
		}
		expect(totalReplayAtoms).toBe(0)

		const loaded = await loadAppState(memory)
		expect(loaded.atoms.balance).toBe(atomsAfterFirst)
		expect(loaded.daily.history['2026-09-12']?.bonusGranted).toBe(true)
	})

	it('records midnight start date, not completion wall clock', async () => {
		const memory = new MemoryStorage()
		const result = await playDaily(memory, '2026-09-12', 'midnight-1')
		expect(result.dailyDateKey).toBe('2026-09-12')
		const loaded = await loadAppState(memory)
		expect(loaded.daily.history['2026-09-12']?.completed).toBe(true)
		expect(loaded.daily.history['2026-09-13']).toBeUndefined()

		const today = await playDaily(memory, '2026-09-13', 'midnight-2')
		expect(today.isDailyFirstCompletion).toBe(true)
		expect(today.dailyCurrentStreak).toBe(2)
	})

	it('does not re-grant bonus after clock back to a completed date', async () => {
		const memory = new MemoryStorage()
		await playDaily(memory, '2026-09-12', 'clock-a')
		await playDaily(memory, '2026-09-10', 'clock-b')
		const again = await playDaily(memory, '2026-09-12', 'clock-a2')
		expect(again.isDailyReplay).toBe(true)
		expect(again.atomsEarned).toBe(0)
		expect(again.dailyBonusGranted).toBe(0)
	})
})

describe('schema v4 daily migration', () => {
	it('migrates v3 to empty daily streak/history', () => {
		const migrated = migratePersistedState({
			schemaVersion: 3,
			atoms: {
				balance: 42,
				lifetimeEarned: 42,
				lifetimeSpent: 0,
				startingGranted: true,
			},
			elementStats: {
				'26': {
					shown: 2,
					correct: 1,
					wrong: 1,
					assistedCorrect: 0,
					lastSeenAt: null,
				},
			},
			modeStats: {
				CLASSIC: {
					gamesPlayed: 3,
					bestScore: 100,
					bestCorrect: 8,
					bestStreak: 5,
					bestAccuracy: 0.8,
				},
			},
			daily: {
				lastDailyDate: '2026-01-01',
				dailySeed: 123,
				dailyCompleted: true,
			},
		})
		expect(migrated.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(migrated.schemaVersion).toBe(5)
		expect(migrated.atoms.balance).toBe(42)
		expect(migrated.elementStats['26']?.wrong).toBe(1)
		expect(migrated.modeStats.CLASSIC.bestScore).toBe(100)
		expect(migrated.daily.currentStreak).toBe(0)
		expect(migrated.daily.bestStreak).toBe(0)
		expect(migrated.daily.lastCompletedDateKey).toBeNull()
		expect(migrated.daily.history).toEqual({})
		expect(migrated.onboardingCompleted).toBe(true)
	})

	it('sanitizes corrupt daily history', () => {
		const migrated = migratePersistedState({
			schemaVersion: 4,
			daily: {
				currentStreak: -3,
				bestStreak: 1,
				lastCompletedDateKey: 'bad',
				history: {
					'2026-99-99': { completed: true, score: 10 },
					'2026-09-12': {
						completed: true,
						score: 50,
						correct: 8,
						total: 10,
						bestStreak: 3,
						atomsEarned: 12,
						completedAt: 'x',
						firstCompletionAt: 'x',
						bestScore: 50,
						bestCorrect: 8,
						bestAccuracy: 2,
						bonusGranted: true,
					},
				},
			},
		})
		expect(migrated.daily.currentStreak).toBe(0)
		expect(migrated.daily.lastCompletedDateKey).toBeNull()
		expect(migrated.daily.history['2026-99-99']).toBeUndefined()
		expect(migrated.daily.history['2026-09-12']?.bestAccuracy).toBe(1)
	})
})
