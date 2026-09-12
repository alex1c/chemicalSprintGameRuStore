/**
 * Deterministic Daily Sprint seed + generation versioning.
 */

/** Bump when the Daily question algorithm changes incompatibly. */
export const DAILY_GENERATION_VERSION = 1

/** Atoms granted once per calendar date on first Daily completion. */
export const DAILY_COMPLETION_BONUS = 5

export const DAILY_QUESTION_COUNT = 10

/**
 * Stable FNV-1a 32-bit hash of a string → unsigned seed for Mulberry32.
 */
export function hashStringToSeed(input: string): number {
	let hash = 0x811c9dc5
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i)
		hash = Math.imul(hash, 0x01000193)
	}
	return hash >>> 0
}

/**
 * Daily seed depends only on generation version + date key.
 */
export function createDailySeed(dateKey: string): number {
	return hashStringToSeed(`v${DAILY_GENERATION_VERSION}:${dateKey}`)
}
