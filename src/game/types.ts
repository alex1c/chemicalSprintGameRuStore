import type { ChemicalElement, ElementClassification } from '../data/chemistry'

/**
 * Supported question types for engine v1.
 * New types can be registered later without rewriting session logic.
 */
export type QuestionType =
	| 'NAME_TO_SYMBOL'
	| 'SYMBOL_TO_NAME'
	| 'NAME_TO_ATOMIC_NUMBER'
	| 'ATOMIC_NUMBER_TO_NAME'
	| 'NAME_TO_GROUP'
	| 'ELEMENT_TO_CLASSIFICATION'

export const QUESTION_TYPES: readonly QuestionType[] = [
	'NAME_TO_SYMBOL',
	'SYMBOL_TO_NAME',
	'NAME_TO_ATOMIC_NUMBER',
	'ATOMIC_NUMBER_TO_NAME',
	'NAME_TO_GROUP',
	'ELEMENT_TO_CLASSIFICATION',
] as const

export type AnswerValue = string

/**
 * Session UI/engine phase.
 * - question: waiting for an answer (includes second-chance retry)
 * - feedback: answer locked, showing result before auto-advance
 * - complete: all questions answered
 */
export type SessionPhase = 'question' | 'feedback' | 'complete'

export interface QuestionMetadata {
	/** Human-readable Russian label for the question type. */
	typeLabelRu: string
	/** Optional distractor strategy tag for analytics. */
	distractorStrategy: string
}

/**
 * Fully UI-ready question payload produced by the pure engine.
 */
export interface QuizQuestion {
	id: string
	type: QuestionType
	elementAtomicNumber: number
	prompt: string
	correctAnswer: AnswerValue
	choices: AnswerValue[]
	explanation: string
	metadata: QuestionMetadata
}

export interface AnswerEvaluation {
	correct: boolean
	selectedAnswer: AnswerValue
	correctAnswer: AnswerValue
	element: ChemicalElement
	explanation: string
}

export interface SessionAnswerRecord {
	questionId: string
	questionType: QuestionType
	elementAtomicNumber: number
	selectedAnswer: AnswerValue
	correctAnswer: AnswerValue
	correct: boolean
	/** Points awarded for this answer (0 when wrong). */
	pointsEarned: number
	/** True when this final wrong answer was taken after a second-chance miss. */
	usedSecondChance?: boolean
}

/**
 * Per-question hint / economy state (reset when advancing to the next question).
 */
export interface SessionHintState {
	fiftyFiftyUsed: boolean
	factUsed: boolean
	secondChanceActivated: boolean
	/** First wrong already consumed the second-chance shield. */
	secondChanceConsumed: boolean
	/** Indexes into question.choices that are faded by 50/50. */
	hiddenChoiceIndexes: number[]
	factText: string | null
	/** Wrong choices blocked after a second-chance first miss. */
	eliminatedChoices: string[]
	/** Save-streak already applied on this question's feedback. */
	saveStreakUsed: boolean
	/**
	 * Streak value immediately before the wrong answer that opened feedback.
	 * Used by Save Streak restore.
	 */
	streakBeforeWrong: number | null
	/** Short UI flag after a second-chance miss. */
	awaitingSecondAttempt: boolean
}

export interface SessionEconomyExtensions {
	/** Pending atoms earned this session (committed only on complete). */
	atomsEarned: number
	/** Atoms spent on hints during this session (wallet already debited). */
	atomsSpent: number
	/** Total hint activations this session. */
	hintsUsed: number
	elapsedMs: number
	/** Prevents double reward commit on Result replay. */
	rewardsCommitted: boolean
	hintState: SessionHintState
	hintUsage: {
		fiftyFifty: number
		fact: number
		secondChance: number
		saveStreak: number
	}
}

export interface GameSession {
	id: string
	questionCount: number
	questions: QuizQuestion[]
	currentIndex: number
	answers: SessionAnswerRecord[]
	correctCount: number
	wrongCount: number
	currentStreak: number
	bestStreak: number
	score: number
	phase: SessionPhase
	isComplete: boolean
	/** Points earned by the most recent answer (useful for +N UI). */
	lastPointsEarned: number
	extensions: SessionEconomyExtensions
}

export interface SessionStats {
	answeredCount: number
	correctCount: number
	wrongCount: number
	currentStreak: number
	bestStreak: number
	score: number
	accuracy: number
	isComplete: boolean
	phase: SessionPhase
}

export type ClassificationChoice = ElementClassification

export function createInitialHintState(): SessionHintState {
	return {
		fiftyFiftyUsed: false,
		factUsed: false,
		secondChanceActivated: false,
		secondChanceConsumed: false,
		hiddenChoiceIndexes: [],
		factText: null,
		eliminatedChoices: [],
		saveStreakUsed: false,
		streakBeforeWrong: null,
		awaitingSecondAttempt: false,
	}
}

export function createInitialEconomyExtensions(): SessionEconomyExtensions {
	return {
		atomsEarned: 0,
		atomsSpent: 0,
		hintsUsed: 0,
		elapsedMs: 0,
		rewardsCommitted: false,
		hintState: createInitialHintState(),
		hintUsage: {
			fiftyFifty: 0,
			fact: 0,
			secondChance: 0,
			saveStreak: 0,
		},
	}
}
