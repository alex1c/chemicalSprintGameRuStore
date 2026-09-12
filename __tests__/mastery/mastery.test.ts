import { calculateAtomRewards } from '../../src/economy'
import {
	ELEMENTS,
	getElementByAtomicNumber,
} from '../../src/data/chemistry'
import {
	answerCurrentQuestion,
	createModeSession,
	createSeededRng,
	getApplicableQuestionTypes,
} from '../../src/game'
import {
	CATEGORY_LABELS_RU,
	ELEMENT_TRAINING_MAX_ATOMS,
	filterAndSearchElements,
	formatGroupLabel,
	formatLastSeenLabel,
	getCategoryLabelRu,
	getEffectiveAccuracy,
	getElementMastery,
	getElementsByMastery,
	getFirstTryAccuracy,
	getMasterySummary,
	outcomesSumToShown,
	searchElements,
} from '../../src/mastery'
import {
	applyElementOutcome,
	createEmptyElementPerformance,
	type ElementStatsMap,
} from '../../src/modes'
import { persistCompletedSessionStats } from '../../src/stats'
import {
	loadAppState,
	STORAGE_SCHEMA_VERSION,
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

describe('mastery levels', () => {
	it('marks unseen when shown is 0', () => {
		expect(getElementMastery(undefined)).toBe('UNSEEN')
		expect(getElementMastery(createEmptyElementPerformance())).toBe('UNSEEN')
	})

	it('marks learning for small samples or low accuracy', () => {
		const small = applyElementOutcome(undefined, 'first_try_correct')
		expect(getElementMastery(small)).toBe('LEARNING')

		let low = createEmptyElementPerformance()
		for (let i = 0; i < 4; i += 1) {
			low = applyElementOutcome(low, 'wrong')
		}
		expect(getElementMastery(low)).toBe('LEARNING')
	})

	it('marks familiar with enough samples and effective accuracy', () => {
		let stats = createEmptyElementPerformance()
		stats = applyElementOutcome(stats, 'first_try_correct')
		stats = applyElementOutcome(stats, 'first_try_correct')
		stats = applyElementOutcome(stats, 'wrong')
		expect(stats.shown).toBe(3)
		expect(getEffectiveAccuracy(stats)).toBeCloseTo(2 / 3, 5)
		expect(getElementMastery(stats)).toBe('FAMILIAR')
	})

	it('marks mastered only with strong first-try accuracy', () => {
		let stats = createEmptyElementPerformance()
		for (let i = 0; i < 5; i += 1) {
			stats = applyElementOutcome(stats, 'first_try_correct')
		}
		expect(getFirstTryAccuracy(stats)).toBe(1)
		expect(getElementMastery(stats)).toBe('MASTERED')
	})

	it('does not master assisted-heavy performance', () => {
		let stats = createEmptyElementPerformance()
		stats = applyElementOutcome(stats, 'first_try_correct')
		for (let i = 0; i < 4; i += 1) {
			stats = applyElementOutcome(stats, 'assisted_correct')
		}
		expect(stats.shown).toBe(5)
		expect(getElementMastery(stats)).not.toBe('MASTERED')
	})

	it('allows mastery regression after new wrongs', () => {
		let stats = createEmptyElementPerformance()
		for (let i = 0; i < 5; i += 1) {
			stats = applyElementOutcome(stats, 'first_try_correct')
		}
		expect(getElementMastery(stats)).toBe('MASTERED')
		for (let i = 0; i < 4; i += 1) {
			stats = applyElementOutcome(stats, 'wrong')
		}
		expect(getElementMastery(stats)).not.toBe('MASTERED')
	})

	it('keeps outcome buckets summing to shown', () => {
		let stats = createEmptyElementPerformance()
		stats = applyElementOutcome(stats, 'first_try_correct')
		stats = applyElementOutcome(stats, 'wrong')
		stats = applyElementOutcome(stats, 'assisted_correct')
		expect(outcomesSumToShown(stats)).toBe(true)
	})
})

describe('mastery summary', () => {
	it('counts always sum to 118', () => {
		const stats: ElementStatsMap = {
			'26': {
				shown: 5,
				correct: 5,
				wrong: 0,
				assistedCorrect: 0,
				lastSeenAt: null,
			},
			'11': {
				shown: 3,
				correct: 1,
				wrong: 2,
				assistedCorrect: 0,
				lastSeenAt: null,
			},
			'8': {
				shown: 1,
				correct: 0,
				wrong: 0,
				assistedCorrect: 1,
				lastSeenAt: null,
			},
		}
		const summary = getMasterySummary(stats, 118)
		expect(
			summary.unseen + summary.learning + summary.familiar + summary.mastered,
		).toBe(118)
		expect(summary.mastered).toBe(1)
		expect(summary.unseen).toBe(115)
		expect(summary.progressPercent).toBe(Math.round((1 / 118) * 100))
		expect(getElementsByMastery(stats, 'MASTERED', 118)).toEqual([26])
	})
})

describe('search and filters', () => {
	const all = ELEMENTS.map((el) => el.atomicNumber)

	it('finds by symbol case-insensitively', () => {
		expect(searchElements(all, 'fe')).toContain(26)
		expect(searchElements(all, 'FE')).toContain(26)
		expect(searchElements(all, 'Fe')).toContain(26)
	})

	it('finds by Russian name and atomic number', () => {
		expect(searchElements(all, 'Железо')).toContain(26)
		expect(searchElements(all, '26')).toEqual([26])
	})

	it('applies search inside mastered filter', () => {
		const stats: ElementStatsMap = {
			'26': {
				shown: 5,
				correct: 5,
				wrong: 0,
				assistedCorrect: 0,
				lastSeenAt: null,
			},
		}
		expect(filterAndSearchElements(stats, 'MASTERED', 'Fe', 118)).toEqual([
			26,
		])
		expect(filterAndSearchElements(stats, 'MASTERED', 'Na', 118)).toEqual([])
	})

	it('returns current set for empty search', () => {
		expect(searchElements([1, 2, 3], '')).toEqual([1, 2, 3])
	})
})

describe('detail helpers', () => {
	it('formats null group and localized categories', () => {
		expect(formatGroupLabel(null)).toBe('—')
		expect(formatGroupLabel(8)).toBe('8')
		expect(getCategoryLabelRu('transition-metal')).toBe('Переходный металл')
		expect(CATEGORY_LABELS_RU['post-transition-metal']).toBe(
			'Постпереходный металл',
		)
	})

	it('handles accuracy and lastSeen at shown=0', () => {
		const empty = createEmptyElementPerformance()
		expect(getFirstTryAccuracy(empty)).toBe(0)
		expect(formatLastSeenLabel(null)).toBe('Ещё не тренировался')
	})
})

describe('single-element training', () => {
	it('builds 5 questions for a fixed element with diverse types', () => {
		const session = createModeSession('ELEMENT_TRAINING', {
			seed: 42,
			focusAtomicNumber: 26,
		})
		expect(session).not.toBeNull()
		expect(session!.questions).toHaveLength(5)
		expect(
			session!.questions.every((q) => q.elementAtomicNumber === 26),
		).toBe(true)
		const types = new Set(session!.questions.map((q) => q.type))
		expect(types.size).toBeGreaterThanOrEqual(4)
	})

	it('excludes NAME_TO_GROUP for null-group elements', () => {
		const cerium = getElementByAtomicNumber(58)!
		expect(cerium.group).toBeNull()
		const types = getApplicableQuestionTypes(cerium)
		expect(types).not.toContain('NAME_TO_GROUP')

		const session = createModeSession('ELEMENT_TRAINING', {
			seed: 7,
			focusAtomicNumber: 58,
		})!
		expect(
			session.questions.every((q) => q.type !== 'NAME_TO_GROUP'),
		).toBe(true)
		expect(
			session.questions.every((q) => q.elementAtomicNumber === 58),
		).toBe(true)
	})

	it('caps atom rewards and skips record bonus', () => {
		const rewards = calculateAtomRewards({
			correctCount: 5,
			wrongCount: 0,
			questionCount: 5,
			bestStreak: 5,
			isNewBestScore: true,
			modeId: 'ELEMENT_TRAINING',
			sessionCompleted: true,
		})
		expect(rewards.perfect).toBe(0)
		expect(rewards.newRecord).toBe(0)
		expect(rewards.total).toBeLessThanOrEqual(ELEMENT_TRAINING_MAX_ATOMS)
	})

	it('updates element stats without polluting mode/global records', async () => {
		const memory = new MemoryStorage()
		let session = createModeSession('ELEMENT_TRAINING', {
			seed: 9,
			focusAtomicNumber: 26,
		})!
		for (let i = 0; i < 5; i += 1) {
			session = answerCurrentQuestion(
				session,
				session.questions[i]!.correctAnswer,
			)
		}
		expect(session.isComplete).toBe(true)

		const result = await persistCompletedSessionStats(session, memory)
		expect(result.persisted).toBe(true)
		expect(result.isNewBestScore).toBe(false)
		expect(result.isNewModeRecord).toBe(false)
		expect(result.atomsEarned).toBeLessThanOrEqual(ELEMENT_TRAINING_MAX_ATOMS)

		const loaded = await loadAppState(memory)
		expect(loaded.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(loaded.statistics.bestScore).toBe(0)
		expect(loaded.modeStats.CLASSIC.bestScore).toBe(0)
		expect(loaded.elementStats['26']?.shown).toBe(5)
		expect(loaded.elementStats['26']?.correct).toBe(5)
	})
})

describe('rng determinism helper', () => {
	it('keeps seeded sessions stable', () => {
		const a = createModeSession('ELEMENT_TRAINING', {
			rng: createSeededRng(100),
			focusAtomicNumber: 1,
		})!
		const b = createModeSession('ELEMENT_TRAINING', {
			rng: createSeededRng(100),
			focusAtomicNumber: 1,
		})!
		expect(a.questions.map((q) => q.type)).toEqual(
			b.questions.map((q) => q.type),
		)
	})
})
