import {
	ELEMENTS,
	getElementsWithGroup,
	type ChemicalElement,
} from '../data/chemistry'
import { pickOne, randomInt, type Rng } from './rng'

const MAX_DISTRACTOR_ATTEMPTS = 64

/**
 * Collect unique distractor values with a hard attempt cap (no infinite loops).
 */
function collectUniqueDistractors(
	needed: number,
	correct: string,
	pickCandidate: () => string,
	fallbackValues: readonly string[],
): string[] {
	const result: string[] = []
	const seen = new Set<string>([correct])
	let attempts = 0

	while (result.length < needed && attempts < MAX_DISTRACTOR_ATTEMPTS) {
		attempts += 1
		const candidate = pickCandidate()
		if (seen.has(candidate)) {
			continue
		}
		seen.add(candidate)
		result.push(candidate)
	}

	// Typed fallback pool if similarity sampling could not fill all slots.
	if (result.length < needed) {
		for (const value of fallbackValues) {
			if (seen.has(value)) {
				continue
			}
			seen.add(value)
			result.push(value)
			if (result.length >= needed) {
				break
			}
		}
	}

	if (result.length < needed) {
		throw new Error('Unable to collect enough unique distractors')
	}

	return result
}

/**
 * Prefer symbols that share length, first letter, or nearby atomic numbers.
 */
export function pickSymbolDistractors(
	element: ChemicalElement,
	rng: Rng,
	count = 3,
): string[] {
	const pool = ELEMENTS.filter((el) => el.symbol !== element.symbol)
	const similar = pool.filter((el) => {
		const sameLength = el.symbol.length === element.symbol.length
		const sameFirst =
			el.symbol[0]?.toLowerCase() === element.symbol[0]?.toLowerCase()
		const nearby = Math.abs(el.atomicNumber - element.atomicNumber) <= 12
		return sameLength || sameFirst || nearby
	})

	const preferred = similar.length >= count ? similar : pool
	const fallback = pool.map((el) => el.symbol)

	return collectUniqueDistractors(
		count,
		element.symbol,
		() => pickOne(preferred, rng).symbol,
		fallback,
	)
}

/**
 * Prefer Russian names from the same category/period or nearby Z.
 */
export function pickNameDistractors(
	element: ChemicalElement,
	rng: Rng,
	count = 3,
): string[] {
	const pool = ELEMENTS.filter((el) => el.nameRu !== element.nameRu)
	const similar = pool.filter((el) => {
		const sameCategory = el.category === element.category
		const samePeriod = el.period === element.period
		const nearby = Math.abs(el.atomicNumber - element.atomicNumber) <= 10
		return sameCategory || samePeriod || nearby
	})
	const preferred = similar.length >= count ? similar : pool
	const fallback = pool.map((el) => el.nameRu)

	return collectUniqueDistractors(
		count,
		element.nameRu,
		() => pickOne(preferred, rng).nameRu,
		fallback,
	)
}

/**
 * Prefer atomic numbers close to the correct value.
 */
export function pickAtomicNumberDistractors(
	element: ChemicalElement,
	rng: Rng,
	count = 3,
): string[] {
	const correct = String(element.atomicNumber)
	const fallback = ELEMENTS
		.filter((el) => el.atomicNumber !== element.atomicNumber)
		.map((el) => String(el.atomicNumber))

	return collectUniqueDistractors(
		count,
		correct,
		() => {
			const radius = randomInt(rng, 1, 15)
			const direction = rng() < 0.5 ? -1 : 1
			let candidate = element.atomicNumber + direction * radius
			if (candidate < 1 || candidate > 118 || candidate === element.atomicNumber) {
				candidate = randomInt(rng, 1, 118)
			}
			return String(candidate)
		},
		fallback,
	)
}

/**
 * Prefer neighbouring IUPAC groups for group questions.
 */
export function pickGroupDistractors(
	element: ChemicalElement,
	rng: Rng,
	count = 3,
): string[] {
	if (element.group === null) {
		throw new Error('pickGroupDistractors requires an element with a group')
	}

	const correct = String(element.group)
	const grouped = getElementsWithGroup()
	const groupValues = Array.from(
		new Set(grouped.map((el) => el.group as number)),
	).filter((g) => g !== element.group)

	const nearby = groupValues.filter((g) => Math.abs(g - element.group!) <= 3)
	const preferred = nearby.length >= count ? nearby : groupValues
	const fallback = groupValues.map(String)

	return collectUniqueDistractors(
		count,
		correct,
		() => String(pickOne(preferred, rng)),
		fallback,
	)
}
