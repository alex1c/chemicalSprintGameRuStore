import { ELEMENTS } from '../data/chemistry'
import { createSeededRng, shuffleInPlace } from '../game/rng'
import { generateQuestion } from '../game/questions'
import { QUESTION_TYPES, type QuestionType, type QuizQuestion } from '../game/types'
import { DAILY_QUESTION_COUNT, createDailySeed } from './seed'

/**
 * Build a balanced 10-type list: every type at least once, extras from the seed.
 */
export function buildDailyTypePlan(rng: () => number): QuestionType[] {
	const base = shuffleInPlace([...QUESTION_TYPES], rng)
	const extras: QuestionType[] = []
	const remaining = DAILY_QUESTION_COUNT - base.length
	for (let i = 0; i < remaining; i += 1) {
		const index = Math.floor(rng() * QUESTION_TYPES.length)
		extras.push(QUESTION_TYPES[index]!)
	}
	return shuffleInPlace([...base, ...extras], rng)
}

/**
 * Pick N unique elements without replacement (seeded).
 */
export function pickDailyElements(
	count: number,
	rng: () => number,
): typeof ELEMENTS {
	if (count > ELEMENTS.length) {
		throw new Error('Cannot pick more daily elements than the catalog')
	}
	const shuffled = shuffleInPlace([...ELEMENTS], rng)
	return shuffled.slice(0, count)
}

/**
 * Deterministic Daily challenge for a date key.
 * Same dateKey → identical questions/types/choices across launches.
 */
export function createDailyChallenge(dateKey: string): {
	dateKey: string
	seed: number
	questions: QuizQuestion[]
} {
	const seed = createDailySeed(dateKey)
	const rng = createSeededRng(seed)
	const types = buildDailyTypePlan(rng)
	const elements = pickDailyElements(DAILY_QUESTION_COUNT, rng)
	const questions: QuizQuestion[] = []

	for (let i = 0; i < DAILY_QUESTION_COUNT; i += 1) {
		let type = types[i]!
		const element = elements[i]!
		// Skip NAME_TO_GROUP when the chosen element has no group.
		if (type === 'NAME_TO_GROUP' && element.group === null) {
			type = 'ELEMENT_TO_CLASSIFICATION'
		}
		questions.push(
			generateQuestion({
				rng,
				type,
				forceElement: element,
			}),
		)
	}

	return { dateKey, seed, questions }
}
