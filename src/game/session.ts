import { CLASSIC_SESSION_QUESTION_COUNT } from '../constants/app'
import { generateQuestionSet } from './questions'
import { evaluateAnswer } from './evaluate'
import { createSeededRng, defaultRng, type Rng } from './rng'
import { computeCorrectAnswerPoints, SCORING_CONFIG, type ScoringConfig } from './scoring'
import type {
	AnswerValue,
	GameSession,
	QuestionType,
	SessionStats,
} from './types'

export interface CreateSessionOptions {
	questionCount?: number
	rng?: Rng
	seed?: number
	types?: readonly QuestionType[]
	scoring?: ScoringConfig
	sessionId?: string
}

/**
 * Create a classic quiz session with a fixed question list.
 */
export function createGameSession(options: CreateSessionOptions = {}): GameSession {
	const questionCount = options.questionCount ?? CLASSIC_SESSION_QUESTION_COUNT
	const rng =
		options.rng ??
		(typeof options.seed === 'number' ? createSeededRng(options.seed) : defaultRng)
	const idSalt = Math.floor(rng() * 1_000_000)
	const questions = generateQuestionSet(questionCount, rng, options.types)

	return {
		id: options.sessionId ?? `session-${idSalt}`,
		questionCount,
		questions,
		currentIndex: 0,
		answers: [],
		correctCount: 0,
		wrongCount: 0,
		currentStreak: 0,
		bestStreak: 0,
		score: 0,
		isComplete: questionCount === 0,
		extensions: {
			atomsEarned: 0,
			hintsUsed: 0,
			elapsedMs: 0,
		},
	}
}

/**
 * Submit an answer for the current question and advance the session.
 * Returns a new session object (immutable update style).
 */
export function answerCurrentQuestion(
	session: GameSession,
	selectedAnswer: AnswerValue,
	scoring: ScoringConfig = SCORING_CONFIG,
): GameSession {
	if (session.isComplete) {
		return session
	}

	const question = session.questions[session.currentIndex]
	if (!question) {
		return { ...session, isComplete: true }
	}

	const evaluation = evaluateAnswer(question, selectedAnswer)
	let currentStreak = session.currentStreak
	let bestStreak = session.bestStreak
	let score = session.score
	let correctCount = session.correctCount
	let wrongCount = session.wrongCount

	if (evaluation.correct) {
		currentStreak += 1
		bestStreak = Math.max(bestStreak, currentStreak)
		correctCount += 1
		score += computeCorrectAnswerPoints(currentStreak, scoring)
	} else {
		currentStreak = 0
		wrongCount += 1
	}

	const nextIndex = session.currentIndex + 1
	const isComplete = nextIndex >= session.questionCount

	return {
		...session,
		currentIndex: isComplete ? session.currentIndex : nextIndex,
		answers: [
			...session.answers,
			{
				questionId: question.id,
				questionType: question.type,
				elementAtomicNumber: question.elementAtomicNumber,
				selectedAnswer,
				correctAnswer: question.correctAnswer,
				correct: evaluation.correct,
			},
		],
		correctCount,
		wrongCount,
		currentStreak,
		bestStreak,
		score,
		isComplete,
	}
}

/**
 * Derive presentation/stats snapshot from a session.
 */
export function getSessionStats(session: GameSession): SessionStats {
	const answeredCount = session.answers.length
	const accuracy =
		answeredCount === 0 ? 0 : session.correctCount / answeredCount

	return {
		answeredCount,
		correctCount: session.correctCount,
		wrongCount: session.wrongCount,
		currentStreak: session.currentStreak,
		bestStreak: session.bestStreak,
		score: session.score,
		accuracy,
		isComplete: session.isComplete,
	}
}

export function getCurrentQuestion(session: GameSession) {
	if (session.isComplete) {
		return null
	}
	return session.questions[session.currentIndex] ?? null
}
