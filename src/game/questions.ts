import {
	CLASSIFICATION_LABELS_RU,
	ELEMENTS,
	ELEMENT_CLASSIFICATIONS,
	getElementsWithGroup,
	type ChemicalElement,
} from '../data/chemistry'
import {
	pickAtomicNumberDistractors,
	pickGroupDistractors,
	pickNameDistractors,
	pickSymbolDistractors,
} from './distractors'
import { pickOne, shuffleInPlace, type Rng } from './rng'
import type { QuizQuestion, QuestionType } from './types'

export interface GenerateQuestionOptions {
	rng: Rng
	type?: QuestionType
	/** Optional pool override (tests / future modes). */
	elements?: readonly ChemicalElement[]
}

const TYPE_LABELS_RU: Record<QuestionType, string> = {
	NAME_TO_SYMBOL: 'Название → символ',
	SYMBOL_TO_NAME: 'Символ → название',
	NAME_TO_ATOMIC_NUMBER: 'Название → атомный номер',
	ATOMIC_NUMBER_TO_NAME: 'Атомный номер → название',
	NAME_TO_GROUP: 'Название → группа',
	ELEMENT_TO_CLASSIFICATION: 'Элемент → тип',
}

function buildChoices(
	correctAnswer: string,
	distractors: string[],
	rng: Rng,
	expectedCount = 4,
): string[] {
	const choices = shuffleInPlace([correctAnswer, ...distractors], rng)
	if (choices.length !== expectedCount) {
		throw new Error(
			`Expected ${expectedCount} choices, got ${choices.length}`,
		)
	}
	if (new Set(choices).size !== expectedCount) {
		throw new Error('Choices must be unique')
	}
	if (!choices.includes(correctAnswer)) {
		throw new Error('correctAnswer missing from choices')
	}
	return choices
}

function pickElementForType(
	type: QuestionType,
	pool: readonly ChemicalElement[],
	rng: Rng,
): ChemicalElement {
	if (type === 'NAME_TO_GROUP') {
		const withGroup = pool.filter((el) => el.group !== null)
		const source = withGroup.length > 0 ? withGroup : getElementsWithGroup()
		if (source.length === 0) {
			throw new Error('No elements with group available')
		}
		return pickOne(source, rng)
	}
	if (pool.length === 0) {
		throw new Error('Element pool is empty')
	}
	return pickOne(pool, rng)
}

function createQuestionId(
	type: QuestionType,
	element: ChemicalElement,
	rng: Rng,
): string {
	const salt = Math.floor(rng() * 1_000_000)
	return `${type}-${element.atomicNumber}-${salt}`
}

/**
 * Generate a single multiple-choice question of the requested (or random) type.
 */
export function generateQuestion(options: GenerateQuestionOptions): QuizQuestion {
	const rng = options.rng
	const pool = options.elements ?? ELEMENTS
	const type = options.type ?? pickOne(
		[
			'NAME_TO_SYMBOL',
			'SYMBOL_TO_NAME',
			'NAME_TO_ATOMIC_NUMBER',
			'ATOMIC_NUMBER_TO_NAME',
			'NAME_TO_GROUP',
			'ELEMENT_TO_CLASSIFICATION',
		] as QuestionType[],
		rng,
	)

	const element = pickElementForType(type, pool, rng)

	switch (type) {
		case 'NAME_TO_SYMBOL': {
			const correctAnswer = element.symbol
			const distractors = pickSymbolDistractors(element, rng)
			return {
				id: createQuestionId(type, element, rng),
				type,
				elementAtomicNumber: element.atomicNumber,
				prompt: `Какой символ у ${element.nameRu}?`,
				correctAnswer,
				choices: buildChoices(correctAnswer, distractors, rng),
				explanation: element.hintRu,
				metadata: {
					typeLabelRu: TYPE_LABELS_RU[type],
					distractorStrategy: 'similar-symbols',
				},
			}
		}
		case 'SYMBOL_TO_NAME': {
			const correctAnswer = element.nameRu
			const distractors = pickNameDistractors(element, rng)
			return {
				id: createQuestionId(type, element, rng),
				type,
				elementAtomicNumber: element.atomicNumber,
				prompt: `Как называется элемент ${element.symbol}?`,
				correctAnswer,
				choices: buildChoices(correctAnswer, distractors, rng),
				explanation: element.hintRu,
				metadata: {
					typeLabelRu: TYPE_LABELS_RU[type],
					distractorStrategy: 'similar-names',
				},
			}
		}
		case 'NAME_TO_ATOMIC_NUMBER': {
			const correctAnswer = String(element.atomicNumber)
			const distractors = pickAtomicNumberDistractors(element, rng)
			return {
				id: createQuestionId(type, element, rng),
				type,
				elementAtomicNumber: element.atomicNumber,
				prompt: `Какой атомный номер у ${element.nameRu}?`,
				correctAnswer,
				choices: buildChoices(correctAnswer, distractors, rng),
				explanation: element.hintRu,
				metadata: {
					typeLabelRu: TYPE_LABELS_RU[type],
					distractorStrategy: 'nearby-atomic-numbers',
				},
			}
		}
		case 'ATOMIC_NUMBER_TO_NAME': {
			const correctAnswer = element.nameRu
			const distractors = pickNameDistractors(element, rng)
			return {
				id: createQuestionId(type, element, rng),
				type,
				elementAtomicNumber: element.atomicNumber,
				prompt: `Какой элемент имеет атомный номер ${element.atomicNumber}?`,
				correctAnswer,
				choices: buildChoices(correctAnswer, distractors, rng),
				explanation: element.hintRu,
				metadata: {
					typeLabelRu: TYPE_LABELS_RU[type],
					distractorStrategy: 'similar-names',
				},
			}
		}
		case 'NAME_TO_GROUP': {
			if (element.group === null) {
				throw new Error('NAME_TO_GROUP selected element without group')
			}
			const correctAnswer = String(element.group)
			const distractors = pickGroupDistractors(element, rng)
			return {
				id: createQuestionId(type, element, rng),
				type,
				elementAtomicNumber: element.atomicNumber,
				prompt: `В какой группе находится ${element.nameRu}?`,
				correctAnswer,
				choices: buildChoices(correctAnswer, distractors, rng),
				explanation: element.hintRu,
				metadata: {
					typeLabelRu: TYPE_LABELS_RU[type],
					distractorStrategy: 'nearby-groups',
				},
			}
		}
		case 'ELEMENT_TO_CLASSIFICATION': {
			// Only three valid top-level classifications exist; expose all of them.
			const correctAnswer = CLASSIFICATION_LABELS_RU[element.classification]
			const distractors = ELEMENT_CLASSIFICATIONS
				.filter((c) => c !== element.classification)
				.map((c) => CLASSIFICATION_LABELS_RU[c])
			return {
				id: createQuestionId(type, element, rng),
				type,
				elementAtomicNumber: element.atomicNumber,
				prompt: `К какому типу относится ${element.nameRu}?`,
				correctAnswer,
				choices: buildChoices(correctAnswer, distractors, rng, 3),
				explanation: element.hintRu,
				metadata: {
					typeLabelRu: TYPE_LABELS_RU[type],
					distractorStrategy: 'fixed-classification-set',
				},
			}
		}
		default: {
			const _exhaustive: never = type
			throw new Error(`Unsupported question type: ${_exhaustive}`)
		}
	}
}

/**
 * Generate a classic multi-question list with optional type cycling.
 */
export function generateQuestionSet(
	count: number,
	rng: Rng,
	types: readonly QuestionType[] = [
		'NAME_TO_SYMBOL',
		'SYMBOL_TO_NAME',
		'NAME_TO_ATOMIC_NUMBER',
		'ATOMIC_NUMBER_TO_NAME',
		'NAME_TO_GROUP',
		'ELEMENT_TO_CLASSIFICATION',
	],
): QuizQuestion[] {
	if (count <= 0) {
		return []
	}
	if (types.length === 0) {
		throw new Error('generateQuestionSet requires at least one question type')
	}

	const questions: QuizQuestion[] = []
	for (let i = 0; i < count; i += 1) {
		const type = types[i % types.length]!
		questions.push(generateQuestion({ rng, type }))
	}
	return questions
}
