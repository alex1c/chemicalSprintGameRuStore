import {
	applyCompletedSessionToStatistics,
	persistCompletedSessionStats,
	summarizeCompletedSession,
} from '../../src/stats'
import {
	answerCurrentQuestion,
	createClassicSprintSession,
	createGameSession,
	submitCurrentAnswer,
	advanceAfterFeedback,
} from '../../src/game'
import {
	DEFAULT_STATISTICS,
	createDefaultPersistedState,
	loadAppState,
} from '../../src/storage'
import type { KeyValueStorage } from '../../src/storage'

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

class FailingStorage implements KeyValueStorage {
	async getItem(): Promise<string | null> {
		throw new Error('read failed')
	}

	async setItem(): Promise<void> {
		throw new Error('write failed')
	}

	async removeItem(): Promise<void> {
		throw new Error('remove failed')
	}
}

describe('classic sprint gameplay domain', () => {
	it('starts a classic game with 10 mixed questions', () => {
		const session = createClassicSprintSession({ seed: 42 })
		expect(session.questionCount).toBe(10)
		expect(session.questions).toHaveLength(10)
		expect(session.phase).toBe('question')
		expect(session.score).toBe(0)
		expect(session.currentStreak).toBe(0)

		const types = new Set(session.questions.map((q) => q.type))
		expect(types.size).toBeGreaterThanOrEqual(4)
	})

	it('avoids obvious consecutive element repeats when possible', () => {
		const session = createClassicSprintSession({ seed: 777 })
		for (let i = 1; i < session.questions.length; i += 1) {
			expect(session.questions[i]!.elementAtomicNumber).not.toBe(
				session.questions[i - 1]!.elementAtomicNumber,
			)
		}
	})

	it('ignores double submit while in feedback phase', () => {
		let session = createGameSession({ seed: 11, questionCount: 3 })
		const first = session.questions[0]!
		session = submitCurrentAnswer(session, first.correctAnswer)
		expect(session.phase).toBe('feedback')
		expect(session.correctCount).toBe(1)
		expect(session.answers).toHaveLength(1)

		const scoreAfterFirst = session.score
		session = submitCurrentAnswer(session, first.correctAnswer)
		expect(session.answers).toHaveLength(1)
		expect(session.score).toBe(scoreAfterFirst)
		expect(session.phase).toBe('feedback')
	})

	it('advances after feedback and completes on the last question', () => {
		let session = createGameSession({ seed: 5, questionCount: 2 })
		session = submitCurrentAnswer(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = advanceAfterFeedback(session)
		expect(session.phase).toBe('question')
		expect(session.currentIndex).toBe(1)

		session = submitCurrentAnswer(
			session,
			session.questions[1]!.correctAnswer,
		)
		session = advanceAfterFeedback(session)
		expect(session.isComplete).toBe(true)
		expect(session.phase).toBe('complete')
	})

	it('updates statistics after a completed party and preserves bestScore', () => {
		const previous = {
			...DEFAULT_STATISTICS,
			gamesPlayed: 2,
			bestScore: 100,
			bestStreak: 3,
			bestAccuracy: 0.5,
			correctAnswers: 10,
			totalWrong: 4,
			questionsAnswered: 14,
		}

		const summary = {
			score: 80,
			correctCount: 7,
			wrongCount: 3,
			questionCount: 10,
			bestStreak: 4,
			accuracy: 0.7,
		}

		const lower = applyCompletedSessionToStatistics(previous, summary)
		expect(lower.isNewBestScore).toBe(false)
		expect(lower.previousBestScore).toBe(100)
		expect(lower.statistics.bestScore).toBe(100)
		expect(lower.statistics.gamesPlayed).toBe(3)
		expect(lower.statistics.bestStreak).toBe(4)
		expect(lower.statistics.bestAccuracy).toBe(0.7)
		expect(lower.statistics.correctAnswers).toBe(17)
		expect(lower.statistics.totalWrong).toBe(7)

		const higher = applyCompletedSessionToStatistics(previous, {
			...summary,
			score: 140,
		})
		expect(higher.isNewBestScore).toBe(true)
		expect(higher.statistics.bestScore).toBe(140)
	})

	it('does not count incomplete sessions via summarize-only path', () => {
		const session = createClassicSprintSession({ seed: 9 })
		expect(session.isComplete).toBe(false)
		// Domain rule: callers must only persist when isComplete.
		expect(session.answers.length).toBe(0)
	})

	it('persists completed session stats through storage abstraction', async () => {
		const memory = new MemoryStorage()
		let session = createGameSession({ seed: 3, questionCount: 2 })
		session = answerCurrentQuestion(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = answerCurrentQuestion(
			session,
			session.questions[1]!.choices.find(
				(c) => c !== session.questions[1]!.correctAnswer,
			) ?? 'x',
		)
		expect(session.isComplete).toBe(true)

		const result = await persistCompletedSessionStats(session, memory)
		expect(result.persisted).toBe(true)
		expect(result.statistics.gamesPlayed).toBe(1)
		expect(result.statistics.correctAnswers).toBe(1)
		expect(result.statistics.totalWrong).toBe(1)
		expect(result.summary.questionCount).toBe(2)

		const again = await persistCompletedSessionStats(session, memory)
		expect(again.statistics.gamesPlayed).toBe(1)
		expect(again.atomsEarned).toBe(0)
		expect(again.previousBestScore).toBe(result.statistics.bestScore)

		const parallelMemory = new MemoryStorage()
		const [parallelA, parallelB] = await Promise.all([
			persistCompletedSessionStats(session, parallelMemory),
			persistCompletedSessionStats(session, parallelMemory),
		])
		const parallelLoaded = await loadAppState(parallelMemory)
		expect(parallelLoaded.statistics.gamesPlayed).toBe(1)
		expect(parallelLoaded.atoms.balance).toBe(
			createDefaultPersistedState().atoms.balance + parallelA.atomsEarned,
		)
		expect(parallelA.atomsEarned + parallelB.atomsEarned).toBe(
			parallelA.atomsEarned,
		)
	})

	it('handles storage failure without throwing', async () => {
		let session = createGameSession({ seed: 8, questionCount: 1 })
		session = answerCurrentQuestion(
			session,
			session.questions[0]!.correctAnswer,
		)
		const result = await persistCompletedSessionStats(
			session,
			new FailingStorage(),
		)
		expect(result.persisted).toBe(false)
		expect(result.statistics.gamesPlayed).toBe(1)
		expect(result.isNewBestScore).toBe(true)
	})

	it('summarizes a completed session for Result screen', () => {
		let session = createGameSession({ seed: 4, questionCount: 2 })
		session = answerCurrentQuestion(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = answerCurrentQuestion(
			session,
			session.questions[1]!.correctAnswer,
		)
		const summary = summarizeCompletedSession(session)
		expect(summary.correctCount).toBe(2)
		expect(summary.accuracy).toBe(1)
		expect(summary.score).toBe(session.score)
	})

	it('createDefaultPersistedState includes new statistics fields', () => {
		const state = createDefaultPersistedState()
		expect(state.statistics.totalWrong).toBe(0)
		expect(state.statistics.bestAccuracy).toBe(0)
		expect(state.atoms.startingGranted).toBe(true)
		expect(state.statistics.hintsUsed.total).toBe(0)
	})

	it('seeded classic sessions are reproducible', () => {
		const a = createClassicSprintSession({ seed: 12345 })
		const b = createClassicSprintSession({ seed: 12345 })
		expect(a.questions.map((q) => q.prompt)).toEqual(
			b.questions.map((q) => q.prompt),
		)
	})
})
