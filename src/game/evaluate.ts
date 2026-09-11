import {
	getElementByAtomicNumber,
	type ChemicalElement,
} from '../data/chemistry'
import type { AnswerEvaluation, AnswerValue, QuizQuestion } from './types'

/**
 * Pure answer evaluation — no UI side effects.
 */
export function evaluateAnswer(
	question: QuizQuestion,
	selectedAnswer: AnswerValue,
	elementLookup: (atomicNumber: number) => ChemicalElement | undefined = getElementByAtomicNumber,
): AnswerEvaluation {
	const element = elementLookup(question.elementAtomicNumber)
	if (!element) {
		throw new Error(
			`Unknown element atomic number: ${question.elementAtomicNumber}`,
		)
	}

	const correct = selectedAnswer === question.correctAnswer

	return {
		correct,
		selectedAnswer,
		correctAnswer: question.correctAnswer,
		element,
		explanation: question.explanation,
	}
}
