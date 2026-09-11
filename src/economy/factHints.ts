import type { ChemicalElement } from '../data/chemistry'
import type { QuestionType } from '../game/types'

const CATEGORY_HINT_RU: Record<ChemicalElement['category'], string> = {
	'alkali-metal': 'Это щелочной металл.',
	'alkaline-earth-metal': 'Это щёлочноземельный металл.',
	'transition-metal': 'Это переходный металл.',
	'post-transition-metal': 'Это постпереходный металл.',
	metalloid: 'Это металлоид.',
	nonmetal: 'Это неметалл.',
	halogen: 'Это галоген.',
	'noble-gas': 'Это благородный газ.',
	lanthanide: 'Это лантаноид.',
	actinide: 'Это актиноид.',
}

/**
 * True when the hint text leaks the correct answer for the active question type.
 */
export function hintLeaksAnswer(
	hint: string,
	questionType: QuestionType,
	element: ChemicalElement,
	correctAnswer: string,
): boolean {
	const normalized = hint.toLocaleLowerCase('ru-RU')
	const answer = correctAnswer.toLocaleLowerCase('ru-RU')
	const symbol = element.symbol.toLocaleLowerCase('ru-RU')
	const nameRu = element.nameRu.toLocaleLowerCase('ru-RU')
	const nameEn = element.nameEn.toLocaleLowerCase('en-US')
	const atomic = String(element.atomicNumber)

	if (containsAnswer(normalized, answer)) {
		return true
	}

	switch (questionType) {
		case 'NAME_TO_SYMBOL':
		case 'SYMBOL_TO_NAME':
			return (
				containsToken(normalized, symbol) ||
				containsToken(normalized, nameRu) ||
				containsToken(normalized, nameEn)
			)
		case 'NAME_TO_ATOMIC_NUMBER':
		case 'ATOMIC_NUMBER_TO_NAME':
			return (
				containsToken(normalized, atomic) ||
				containsToken(normalized, nameRu) ||
				normalized.includes(`№${atomic}`)
			)
		case 'NAME_TO_GROUP':
			return (
				normalized.includes(`групп`) &&
				element.group !== null &&
				normalized.includes(String(element.group))
			)
		case 'ELEMENT_TO_CLASSIFICATION':
			return (
				normalized.includes('металл') ||
				normalized.includes('неметалл') ||
				normalized.includes('металлоид')
			)
		default:
			return false
	}
}

function containsAnswer(text: string, answer: string): boolean {
	return containsToken(text, answer)
}

function containsToken(text: string, value: string): boolean {
	const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp(
		`(?:^|[^a-zа-яё0-9])${escaped}(?:$|[^a-zа-яё0-9])`,
		'i',
	).test(text)
}

/**
 * Build a safe in-game fact that educates without spoiling the answer.
 * Prefers sanitized dataset hintRu; falls back to category/period cues.
 */
export function getSafeFactHint(
	element: ChemicalElement,
	questionType: QuestionType,
	correctAnswer: string,
): string {
	const raw = element.hintRu.trim()
	if (
		raw.length > 0 &&
		!hintLeaksAnswer(raw, questionType, element, correctAnswer)
	) {
		return raw
	}

	const categoryLine = CATEGORY_HINT_RU[element.category]
	const periodLine = `Элемент находится в ${element.period}-м периоде.`

	if (questionType === 'ELEMENT_TO_CLASSIFICATION') {
		return periodLine
	}
	if (questionType === 'NAME_TO_GROUP') {
		return `${categoryLine} ${periodLine}`
	}

	return `${categoryLine} ${periodLine}`
}
