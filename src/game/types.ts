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
	isComplete: boolean
	/** Reserved extension slots for later economy / mastery features. */
	extensions: {
		atomsEarned: number
		hintsUsed: number
		elapsedMs: number
	}
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
}

export type ClassificationChoice = ElementClassification
