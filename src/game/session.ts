import { CLASSIC_SESSION_QUESTION_COUNT } from '../constants/app'
import { resetHintStateForNextQuestion } from '../economy/hints'
import { generateQuestionSet } from './questions'
import { evaluateAnswer } from './evaluate'
import { createSeededRng, defaultRng, type Rng } from './rng'
import {
	computeCorrectAnswerPoints,
	SCORING_CONFIG,
	type ScoringConfig,
} from './scoring'
import {
	createInitialEconomyExtensions,
	type AnswerValue,
	type GameSession,
	type QuestionType,
	type SessionStats,
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
		extensions: createInitialEconomyExtensions(),
	}
}

/**
 * Submit an answer for the current question.
 * With an active second chance, the first wrong answer stays in question phase.
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

	const hint = session.extensions.hintState
	if (hint.eliminatedChoices.includes(selectedAnswer)) {
		return session
	}
	if (hint.hiddenChoiceIndexes.some((index) => question.choices[index] === selectedAnswer)) {
		return session
	}

	const evaluation = evaluateAnswer(question, selectedAnswer)
	const streakBeforeAnswer = session.currentStreak

	// Second chance: first wrong does not finish the question or reset streak.
	if (
		!evaluation.correct &&
		hint.secondChanceActivated &&
		!hint.secondChanceConsumed
	) {
		return {
			...session,
			phase: 'question',
			lastPointsEarned: 0,
			extensions: {
				...session.extensions,
				hintState: {
					...hint,
					secondChanceConsumed: true,
					awaitingSecondAttempt: true,
					eliminatedChoices: [...hint.eliminatedChoices, selectedAnswer],
				},
			},
		}
	}

	let currentStreak = session.currentStreak
	let bestStreak = session.bestStreak
	let score = session.score
	let correctCount = session.correctCount
	let wrongCount = session.wrongCount
	let pointsEarned = 0
	let streakBeforeWrong: number | null = null

	if (evaluation.correct) {
		currentStreak += 1
		bestStreak = Math.max(bestStreak, currentStreak)
		correctCount += 1
		pointsEarned = computeCorrectAnswerPoints(currentStreak, scoring)
		score += pointsEarned
	} else {
		streakBeforeWrong = streakBeforeAnswer
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
				usedSecondChance: hint.secondChanceConsumed,
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
		extensions: {
			...session.extensions,
			hintState: {
				...hint,
				awaitingSecondAttempt: false,
				streakBeforeWrong,
			},
		},
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

	const advanced: GameSession = {
		...session,
		currentIndex: nextIndex,
		phase: 'question',
		lastPointsEarned: 0,
		isComplete: false,
	}

	return resetHintStateForNextQuestion(advanced)
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
 * Mark rewards as committed so Result replay cannot double-earn.
 */
export function markRewardsCommitted(
	session: GameSession,
	atomsEarned: number,
): GameSession {
	if (session.extensions.rewardsCommitted) {
		return session
	}
	return {
		...session,
		extensions: {
			...session.extensions,
			atomsEarned,
			rewardsCommitted: true,
		},
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
