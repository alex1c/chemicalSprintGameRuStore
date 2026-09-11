import { CLASSIC_SESSION_QUESTION_COUNT } from '../constants/app'
import { generateQuestionSet } from './questions'
import { evaluateAnswer } from './evaluate'
import { createSeededRng, defaultRng, type Rng } from './rng'
import {
	computeCorrectAnswerPoints,
	SCORING_CONFIG,
	type ScoringConfig,
} from './scoring'
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
	/** Prefer avoiding consecutive repeats of the same element. */
	avoidConsecutiveElementRepeats?: boolean
}

/**
 * Create a classic quiz session with a fixed question list.
 */
export function createGameSession(
	options: CreateSessionOptions = {},
): GameSession {
	const questionCount = options.questionCount ?? CLASSIC_SESSION_QUESTION_COUNT
	const rng =
		options.rng ??
		(typeof options.seed === 'number'
			? createSeededRng(options.seed)
			: defaultRng)
	const idSalt = Math.floor(rng() * 1_000_000)
	const questions = generateQuestionSet(questionCount, rng, options.types, {
		avoidConsecutiveElementRepeats:
			options.avoidConsecutiveElementRepeats ?? true,
	})

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
		phase: questionCount === 0 ? 'complete' : 'question',
		isComplete: questionCount === 0,
		lastPointsEarned: 0,
		extensions: {
			atomsEarned: 0,
			hintsUsed: 0,
			elapsedMs: 0,
		},
	}
}

/**
 * Submit an answer for the current question without advancing the index.
 * Enters the feedback phase so UI can show result before auto-next.
 * Double-submit while in feedback/complete is a no-op.
 */
export function submitCurrentAnswer(
	session: GameSession,
	selectedAnswer: AnswerValue,
	scoring: ScoringConfig = SCORING_CONFIG,
): GameSession {
	if (session.isComplete || session.phase !== 'question') {
		return session
	}

	const question = session.questions[session.currentIndex]
	if (!question) {
		return {
			...session,
			phase: 'complete',
			isComplete: true,
		}
	}

	const evaluation = evaluateAnswer(question, selectedAnswer)
	let currentStreak = session.currentStreak
	let bestStreak = session.bestStreak
	let score = session.score
	let correctCount = session.correctCount
	let wrongCount = session.wrongCount
	let pointsEarned = 0

	if (evaluation.correct) {
		currentStreak += 1
		bestStreak = Math.max(bestStreak, currentStreak)
		correctCount += 1
		pointsEarned = computeCorrectAnswerPoints(currentStreak, scoring)
		score += pointsEarned
	} else {
		currentStreak = 0
		wrongCount += 1
	}

	return {
		...session,
		answers: [
			...session.answers,
			{
				questionId: question.id,
				questionType: question.type,
				elementAtomicNumber: question.elementAtomicNumber,
				selectedAnswer,
				correctAnswer: question.correctAnswer,
				correct: evaluation.correct,
				pointsEarned,
			},
		],
		correctCount,
		wrongCount,
		currentStreak,
		bestStreak,
		score,
		lastPointsEarned: pointsEarned,
		phase: 'feedback',
		isComplete: false,
	}
}

/**
 * Leave feedback phase and move to the next question or complete the session.
 */
export function advanceAfterFeedback(session: GameSession): GameSession {
	if (session.phase !== 'feedback') {
		return session
	}

	const nextIndex = session.currentIndex + 1
	const isComplete = nextIndex >= session.questionCount

	if (isComplete) {
		return {
			...session,
			phase: 'complete',
			isComplete: true,
		}
	}

	return {
		...session,
		currentIndex: nextIndex,
		phase: 'question',
		lastPointsEarned: 0,
		isComplete: false,
	}
}

/**
 * Convenience helper: submit answer and immediately advance (no feedback wait).
 * Kept for unit tests and non-UI consumers.
 */
export function answerCurrentQuestion(
	session: GameSession,
	selectedAnswer: AnswerValue,
	scoring: ScoringConfig = SCORING_CONFIG,
): GameSession {
	const afterSubmit = submitCurrentAnswer(session, selectedAnswer, scoring)
	if (afterSubmit.phase !== 'feedback') {
		return afterSubmit
	}
	return advanceAfterFeedback(afterSubmit)
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
		phase: session.phase,
	}
}

export function getCurrentQuestion(session: GameSession) {
	if (session.questions.length === 0) {
		return null
	}
	// Keep the last question mounted while Result navigation is in flight.
	if (session.phase === 'complete' || session.isComplete) {
		const index = Math.min(
			session.currentIndex,
			session.questionCount - 1,
		)
		return session.questions[index] ?? null
	}
	return session.questions[session.currentIndex] ?? null
}

/** Latest answer record for the current feedback phase (if any). */
export function getLatestAnswer(session: GameSession) {
	if (session.answers.length === 0) {
		return null
	}
	return session.answers[session.answers.length - 1] ?? null
}
