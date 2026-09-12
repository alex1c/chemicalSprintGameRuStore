import {
	activateSecondChance,
	calculateAtomRewards,
	createStartingWallet,
} from '../../src/economy'
import {
	advanceAfterFeedback,
	answerCurrentQuestion,
	createGameSession,
	createModeSession,
	expireTimedSessionIfNeeded,
	getRemainingSeconds,
	getWeakModeAvailability,
	submitCurrentAnswer,
} from '../../src/game'
import {
	GAME_MODE_CONFIGS,
	GAME_MODE_ORDER,
	applyElementOutcome,
	getGameModeConfig,
	isHintAllowed,
	rankWeakAtomicNumbers,
	weaknessScore,
	WEAK_POOL_MIN_SIZE,
	type ElementStatsMap,
} from '../../src/modes'
import {
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
	migratePersistedState,
} from '../../src/storage'

describe('game mode config', () => {
	it('registers all five hub modes with expected hints and end conditions', () => {
		expect(GAME_MODE_ORDER).toHaveLength(5)
		expect(getGameModeConfig('CLASSIC').questionCount).toBe(10)
		expect(getGameModeConfig('TIMED_60').durationMs).toBe(60_000)
		expect(getGameModeConfig('NO_MISTAKE').endCondition).toBe('until_mistake')
		expect(getGameModeConfig('MIXED').questionCount).toBe(15)
		expect(getGameModeConfig('WEAK_ELEMENTS').id).toBe('WEAK_ELEMENTS')
		expect(getGameModeConfig('ELEMENT_TRAINING').questionCount).toBe(5)
		expect(GAME_MODE_ORDER.includes('ELEMENT_TRAINING')).toBe(false)

		expect(isHintAllowed('TIMED_60', 'saveStreak')).toBe(false)
		expect(isHintAllowed('NO_MISTAKE', 'saveStreak')).toBe(false)
		expect(isHintAllowed('CLASSIC', 'saveStreak')).toBe(true)
		expect(isHintAllowed('MIXED', 'fiftyFifty')).toBe(true)
	})
})

describe('timed 60 mode', () => {
	it('starts with a 60s deadline and ends on timeout', () => {
		const now = 1_000_000
		const session = createGameSession({
			modeId: 'TIMED_60',
			seed: 1,
			nowMs: now,
		})
		expect(session.deadlineAt).toBe(now + 60_000)
		expect(getRemainingSeconds(session, now)).toBe(60)

		const expired = expireTimedSessionIfNeeded(session, now + 60_001)
		expect(expired.isComplete).toBe(true)
		expect(expired.endReason).toBe('timeout')
	})

	it('rejects answers after the deadline', () => {
		const now = 5_000_000
		let session = createGameSession({
			modeId: 'TIMED_60',
			seed: 2,
			nowMs: now,
		})
		session = submitCurrentAnswer(
			session,
			session.questions[0]!.correctAnswer,
			undefined,
			now + 70_000,
		)
		expect(session.isComplete).toBe(true)
		expect(session.endReason).toBe('timeout')
		expect(session.answers).toHaveLength(0)
	})

	it('completes once on background-style time jump', () => {
		const now = 9_000_000
		const session = createGameSession({
			modeId: 'TIMED_60',
			seed: 3,
			nowMs: now,
		})
		const jumped = expireTimedSessionIfNeeded(session, now + 120_000)
		expect(jumped.isComplete).toBe(true)
		const again = expireTimedSessionIfNeeded(jumped, now + 180_000)
		expect(again).toEqual(jumped)
	})
})

describe('no mistake mode', () => {
	it('continues on correct and ends on wrong', () => {
		let session = createGameSession({ modeId: 'NO_MISTAKE', seed: 11 })
		session = submitCurrentAnswer(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = advanceAfterFeedback(session)
		expect(session.isComplete).toBe(false)
		expect(session.currentIndex).toBe(1)

		const wrong =
			session.questions[1]!.choices.find(
				(c) => c !== session.questions[1]!.correctAnswer,
			) ?? 'x'
		session = submitCurrentAnswer(session, wrong)
		session = advanceAfterFeedback(session)
		expect(session.isComplete).toBe(true)
		expect(session.endReason).toBe('mistake')
	})

	it('second chance first wrong continues; second wrong ends', () => {
		let session = createGameSession({ modeId: 'NO_MISTAKE', seed: 12 })
		const wallet = createStartingWallet(50)
		const activated = activateSecondChance(session, wallet)
		expect(activated.ok).toBe(true)
		session = activated.session

		const wrongs = session.questions[0]!.choices.filter(
			(c) => c !== session.questions[0]!.correctAnswer,
		)
		session = submitCurrentAnswer(session, wrongs[0]!)
		expect(session.phase).toBe('question')
		expect(session.isComplete).toBe(false)

		session = submitCurrentAnswer(session, wrongs[1]!)
		expect(session.phase).toBe('feedback')
		session = advanceAfterFeedback(session)
		expect(session.isComplete).toBe(true)
		expect(session.endReason).toBe('mistake')
	})
})

describe('mixed mode', () => {
	it('creates 15 questions without consecutive same-element repeats', () => {
		const session = createModeSession('MIXED', { seed: 21 })!
		expect(session.questionCount).toBe(15)
		expect(session.questions).toHaveLength(15)
		for (let i = 1; i < session.questions.length; i += 1) {
			expect(session.questions[i]!.elementAtomicNumber).not.toBe(
				session.questions[i - 1]!.elementAtomicNumber,
			)
		}
		const types = new Set(session.questions.map((q) => q.type))
		expect(types.size).toBeGreaterThanOrEqual(4)
	})
})

describe('weak elements', () => {
	it('reports no-data when pool is too small', () => {
		expect(getWeakModeAvailability({}).available).toBe(false)
		const tiny: ElementStatsMap = {
			'11': {
				shown: 1,
				correct: 0,
				wrong: 1,
				assistedCorrect: 0,
				lastSeenAt: null,
			},
		}
		expect(getWeakModeAvailability(tiny).poolSize).toBeLessThan(
			WEAK_POOL_MIN_SIZE,
		)
		expect(createModeSession('WEAK_ELEMENTS', { elementStats: tiny })).toBeNull()
	})

	it('ranks wrong/assisted elements into the weak pool', () => {
		const stats: ElementStatsMap = {
			'26': {
				shown: 4,
				correct: 4,
				wrong: 0,
				assistedCorrect: 0,
				lastSeenAt: null,
			},
			'11': {
				shown: 3,
				correct: 0,
				wrong: 3,
				assistedCorrect: 0,
				lastSeenAt: null,
			},
			'8': {
				shown: 2,
				correct: 0,
				wrong: 0,
				assistedCorrect: 2,
				lastSeenAt: null,
			},
			'1': {
				shown: 2,
				correct: 0,
				wrong: 2,
				assistedCorrect: 0,
				lastSeenAt: null,
			},
		}
		expect(weaknessScore(stats['26']!)).toBeLessThan(
			weaknessScore(stats['11']!),
		)
		const ranked = rankWeakAtomicNumbers(stats)
		expect(ranked).toContain(11)
		expect(ranked).toContain(8)
		expect(ranked).toContain(1)
		expect(ranked[0]).not.toBe(26)

		const session = createModeSession('WEAK_ELEMENTS', {
			seed: 33,
			elementStats: stats,
		})
		expect(session).not.toBeNull()
		expect(session!.questions).toHaveLength(10)
		for (let i = 1; i < session!.questions.length; i += 1) {
			expect(session!.questions[i]!.elementAtomicNumber).not.toBe(
				session!.questions[i - 1]!.elementAtomicNumber,
			)
		}
	})

	it('tracks first-try / wrong / assisted outcomes', () => {
		let map: ElementStatsMap = {}
		map['11'] = applyElementOutcome(map['11'], 'wrong')
		map['11'] = applyElementOutcome(map['11'], 'assisted_correct')
		map['11'] = applyElementOutcome(map['11'], 'first_try_correct')
		expect(map['11']!.shown).toBe(3)
		expect(map['11']!.wrong).toBe(1)
		expect(map['11']!.assistedCorrect).toBe(1)
		expect(map['11']!.correct).toBe(1)
	})
})

describe('mode-aware atom rewards', () => {
	it('caps timed and no-mistake farming', () => {
		const timed = calculateAtomRewards({
			correctCount: 40,
			wrongCount: 5,
			questionCount: 45,
			bestStreak: 12,
			isNewBestScore: true,
			modeId: 'TIMED_60',
			sessionCompleted: true,
		})
		expect(timed.baseCorrect).toBe(GAME_MODE_CONFIGS.TIMED_60.reward.correctCap)
		expect(timed.total).toBeLessThanOrEqual(30)

		const noMistake = calculateAtomRewards({
			correctCount: 50,
			wrongCount: 1,
			questionCount: 51,
			bestStreak: 50,
			isNewBestScore: false,
			modeId: 'NO_MISTAKE',
			sessionCompleted: true,
		})
		expect(noMistake.baseCorrect).toBe(
			GAME_MODE_CONFIGS.NO_MISTAKE.reward.correctCap,
		)
	})

	it('keeps classic perfect/completion bonuses', () => {
		const classic = calculateAtomRewards({
			correctCount: 10,
			wrongCount: 0,
			questionCount: 10,
			bestStreak: 10,
			isNewBestScore: true,
			modeId: 'CLASSIC',
			sessionCompleted: true,
		})
		expect(classic.perfect).toBe(10)
		expect(classic.completion).toBe(3)
	})

	it('mixed completion bonus is higher than classic', () => {
		expect(GAME_MODE_CONFIGS.MIXED.reward.completionBonus).toBeGreaterThan(
			GAME_MODE_CONFIGS.CLASSIC.reward.completionBonus,
		)
	})
})

describe('schema v3 migration', () => {
	it('migrates v2 state to v3 with empty element/mode stats', () => {
		const migrated = migratePersistedState({
			schemaVersion: 2,
			atoms: {
				balance: 20,
				lifetimeEarned: 20,
				lifetimeSpent: 0,
				startingGranted: true,
			},
			statistics: { gamesPlayed: 1 },
			progress: { unlockedModes: ['classic'], elementMastery: {} },
			completedSessionIds: [],
		})
		expect(migrated.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(migrated.elementStats).toEqual({})
		expect(migrated.modeStats.CLASSIC.gamesPlayed).toBe(0)
		expect(migrated.progress.unlockedModes).toContain('TIMED_60')
	})

	it('sanitizes corrupt element stats', () => {
		const state = migratePersistedState({
			schemaVersion: 3,
			elementStats: {
				'11': { shown: -1, wrong: 2 },
				bad: { shown: 1 },
				'999': { shown: 1, wrong: 1 },
			},
		})
		expect(state.elementStats['11']!.shown).toBe(0)
		expect(state.elementStats['11']!.wrong).toBe(2)
		expect(state.elementStats.bad).toBeUndefined()
		expect(state.elementStats['999']).toBeUndefined()
	})

	it('fresh defaults are schema v3', () => {
		const fresh = createDefaultPersistedState()
		expect(fresh.schemaVersion).toBe(3)
		expect(fresh.modeStats.MIXED.bestScore).toBe(0)
	})
})

describe('classic still works through mode factory', () => {
	it('answers a classic session to completion', () => {
		let session = createModeSession('CLASSIC', { seed: 44, questionCount: 2 })!
		session = answerCurrentQuestion(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = answerCurrentQuestion(
			session,
			session.questions[1]!.correctAnswer,
		)
		expect(session.isComplete).toBe(true)
		expect(session.modeId).toBe('CLASSIC')
		expect(session.endReason).toBe('completed')
	})
})
