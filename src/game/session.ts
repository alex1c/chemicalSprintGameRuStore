import { CLASSIC_SESSION_QUESTION_COUNT } from '../constants/app'
import { ELEMENTS, type ChemicalElement } from '../data/chemistry'
import { resetHintStateForNextQuestion } from '../economy/hints'
import {
	getGameModeConfig,
	type GameModeId,
	type SessionEndReason,
} from '../modes'
import {
	generateQuestion,
	generateQuestionSet,
	generateSingleElementQuestionSet,
} from './questions'
import { evaluateAnswer } from './evaluate'
import { createSeededRng, defaultRng, pickOne, type Rng } from './rng'
import {
	computeCorrectAnswerPoints,
	SCORING_CONFIG,
	type ScoringConfig,
} from './scoring'
import {
	createInitialEconomyExtensions,
	QUESTION_TYPES,
	type AnswerValue,
	type GameSession,
	type QuestionType,
	type QuizQuestion,
	type SessionStats,
} from './types'

export interface CreateSessionOptions {
	modeId?: GameModeId
	questionCount?: number
	rng?: Rng
	seed?: number
	types?: readonly QuestionType[]
	scoring?: ScoringConfig
	sessionId?: string
	/** Prefer avoiding consecutive repeats of the same element. */
	avoidConsecutiveElementRepeats?: boolean
	/** Restrict questions to this element pool (Weak Elements). */
	elements?: readonly ChemicalElement[]
	/** Absolute deadline; defaults from mode duration when timed. */
	deadlineAt?: number | null
	nowMs?: number
	/** Lock all questions to one element (ELEMENT_TRAINING). */
	focusAtomicNumber?: number
	/** Optional prebuilt question list (tests / specialized factories). */
	questions?: QuizQuestion[]
}


function resolveRng(options: CreateSessionOptions): Rng {
	return (
		options.rng ??
		(typeof options.seed === 'number'
			? createSeededRng(options.seed)
			: defaultRng)
	)
}

/**
 * Create a quiz session for the requested mode (defaults to CLASSIC).
 */
export function createGameSession(
	options: CreateSessionOptions = {},
): GameSession {
	const modeId = options.modeId ?? 'CLASSIC'
	const mode = getGameModeConfig(modeId)
	const rng = resolveRng(options)
	const nowMs = options.nowMs ?? Date.now()
	const poolSize =
		options.questionCount ??
		mode.questionCount ??
		mode.poolSize ??
		CLASSIC_SESSION_QUESTION_COUNT

	let questions: QuizQuestion[]
	if (options.questions && options.questions.length > 0) {
		questions = [...options.questions]
	} else if (typeof options.focusAtomicNumber === 'number') {
		const focus = ELEMENTS.find(
			(el) => el.atomicNumber === options.focusAtomicNumber,
		)
		if (!focus) {
			throw new Error(
				`Unknown focusAtomicNumber: ${options.focusAtomicNumber}`,
			)
		}
		questions = generateSingleElementQuestionSet(
			focus,
			Math.max(poolSize, 1),
			rng,
		)
	} else {
		questions = generateQuestionSet(
			Math.max(poolSize, 1),
			rng,
			options.types ?? QUESTION_TYPES,
			{
				avoidConsecutiveElementRepeats:
					options.avoidConsecutiveElementRepeats ?? true,
				elements: options.elements,
			},
		)
	}

	const deadlineAt =
		options.deadlineAt !== undefined
			? options.deadlineAt
			: mode.durationMs
				? nowMs + mode.durationMs
				: null

	const idSalt = Math.floor(rng() * 1_000_000)
	const fixedCount = mode.endCondition === 'fixed_count'
	// Prefer explicit overrides (tests / custom sessions) over mode defaults.
	const questionCount = fixedCount
		? (options.questionCount ?? mode.questionCount ?? questions.length)
		: questions.length

	return {
		id: options.sessionId ?? `session-${modeId}-${idSalt}`,
		modeId,
		questionCount,
		questions,
		currentIndex: 0,
		answers: [],
		correctCount: 0,
		wrongCount: 0,
		currentStreak: 0,
		bestStreak: 0,
		score: 0,
		phase: questions.length === 0 ? 'complete' : 'question',
		isComplete: questions.length === 0,
		lastPointsEarned: 0,
		deadlineAt,
		endReason: questions.length === 0 ? 'insufficient_pool' : null,
		extensions: createInitialEconomyExtensions(),
	}
}

function isTimedOut(session: GameSession, nowMs: number): boolean {
	return (
		session.deadlineAt !== null &&
		nowMs >= session.deadlineAt &&
		!session.isComplete
	)
}

export function completeSession(
	session: GameSession,
	reason: SessionEndReason,
): GameSession {
	if (session.isComplete) {
		return session
	}
	return {
		...session,
		phase: 'complete',
		isComplete: true,
		endReason: reason,
	}
}

/**
 * Append one more question for dynamic modes when the pool is nearly exhausted.
 */
export function appendQuestion(
	session: GameSession,
	rng: Rng = defaultRng,
	elements?: readonly ChemicalElement[],
): GameSession {
	const previous =
		session.questions[session.questions.length - 1]?.elementAtomicNumber ??
		null
	const type = pickOne([...QUESTION_TYPES], rng)
	const next = generateQuestion({
		rng,
		type,
		elements: elements ?? ELEMENTS,
		excludeAtomicNumbers: previous !== null ? [previous] : [],
	})
	const questions: QuizQuestion[] = [...session.questions, next]
	return {
		...session,
		questions,
		questionCount:
			session.modeId === 'CLASSIC' ||
			session.modeId === 'MIXED' ||
			session.modeId === 'WEAK_ELEMENTS'
				? session.questionCount
				: questions.length,
	}
}

function ensureQuestionAvailable(
	session: GameSession,
	rng: Rng,
): GameSession {
	const mode = getGameModeConfig(session.modeId)
	if (mode.endCondition === 'fixed_count') {
		return session
	}
	if (session.currentIndex < session.questions.length - 3) {
		return session
	}
	return appendQuestion(session, rng)
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
	nowMs: number = Date.now(),
): GameSession {
	if (session.isComplete || session.phase !== 'question') {
		return session
	}
	if (isTimedOut(session, nowMs)) {
		return completeSession(session, 'timeout')
	}

	const question = session.questions[session.currentIndex]
	if (!question) {
		return completeSession(session, 'completed')
	}

	const hint = session.extensions.hintState
	if (hint.eliminatedChoices.includes(selectedAnswer)) {
		return session
	}
	if (
		hint.hiddenChoiceIndexes.some(
			(index) => question.choices[index] === selectedAnswer,
		)
	) {
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
export function advanceAfterFeedback(
	session: GameSession,
	nowMs: number = Date.now(),
	rng: Rng = defaultRng,
): GameSession {
	if (session.phase !== 'feedback') {
		return session
	}

	const mode = getGameModeConfig(session.modeId)
	const latest = session.answers[session.answers.length - 1]

	if (isTimedOut(session, nowMs)) {
		return completeSession(session, 'timeout')
	}

	if (
		mode.endCondition === 'until_mistake' &&
		latest &&
		!latest.correct
	) {
		return completeSession(session, 'mistake')
	}

	const nextIndex = session.currentIndex + 1

	if (mode.endCondition === 'fixed_count') {
		if (nextIndex >= session.questionCount) {
			return completeSession(session, 'completed')
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

	// Timed / until-mistake: continue with an expanded pool when needed.
	let withPool = ensureQuestionAvailable(session, rng)
	if (nextIndex >= withPool.questions.length) {
		withPool = appendQuestion(withPool, rng)
	}

	const advanced: GameSession = {
		...withPool,
		currentIndex: nextIndex,
		phase: 'question',
		lastPointsEarned: 0,
		isComplete: false,
		questionCount: withPool.questions.length,
	}
	return resetHintStateForNextQuestion(advanced)
}

/**
 * Convenience helper: submit answer and immediately advance (no feedback wait).
 */
export function answerCurrentQuestion(
	session: GameSession,
	selectedAnswer: AnswerValue,
	scoring: ScoringConfig = SCORING_CONFIG,
	nowMs: number = Date.now(),
): GameSession {
	const afterSubmit = submitCurrentAnswer(
		session,
		selectedAnswer,
		scoring,
		nowMs,
	)
	if (afterSubmit.phase !== 'feedback') {
		return afterSubmit
	}
	return advanceAfterFeedback(afterSubmit, nowMs)
}

/**
 * Force-complete a timed session when the deadline has passed.
 */
export function expireTimedSessionIfNeeded(
	session: GameSession,
	nowMs: number = Date.now(),
): GameSession {
	if (!isTimedOut(session, nowMs)) {
		return session
	}
	return completeSession(session, 'timeout')
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
	if (session.phase === 'complete' || session.isComplete) {
		const index = Math.min(
			session.currentIndex,
			Math.max(session.questions.length - 1, 0),
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

/** Remaining timed seconds (ceil); null when not a timed session. */
export function getRemainingSeconds(
	session: GameSession,
	nowMs: number = Date.now(),
): number | null {
	if (session.deadlineAt === null) {
		return null
	}
	return Math.max(0, Math.ceil((session.deadlineAt - nowMs) / 1000))
}
