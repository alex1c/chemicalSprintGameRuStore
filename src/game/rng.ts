/**
 * Injectable random number generator contract.
 * Returns a float in [0, 1).
 */
export type Rng = () => number

/**
 * Mulberry32 seeded PRNG for deterministic tests and daily challenges.
 */
export function createSeededRng(seed: number): Rng {
	let state = seed >>> 0

	return () => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = Math.imul(state ^ (state >>> 15), 1 | state)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/** Default non-deterministic RNG for live play. */
export const defaultRng: Rng = () => Math.random()

/**
 * Inclusive integer in [min, max] using the provided RNG.
 */
export function randomInt(rng: Rng, min: number, max: number): number {
	if (max < min) {
		throw new Error(`randomInt: max (${max}) < min (${min})`)
	}
	const span = max - min + 1
	return min + Math.floor(rng() * span)
}

/**
 * Fisher–Yates shuffle that mutates a copy and returns it.
 */
export function shuffleInPlace<T>(items: T[], rng: Rng): T[] {
	for (let i = items.length - 1; i > 0; i -= 1) {
		const j = randomInt(rng, 0, i)
		const tmp = items[i]!
		items[i] = items[j]!
		items[j] = tmp
	}
	return items
}

/**
 * Pick one item from a non-empty array.
 */
export function pickOne<T>(items: readonly T[], rng: Rng): T {
	if (items.length === 0) {
		throw new Error('pickOne: empty array')
	}
	return items[randomInt(rng, 0, items.length - 1)]!
}
