/**
 * Pure element-performance helpers for Weak Elements mode.
 */

export interface ElementPerformance {
	shown: number
	correct: number
	wrong: number
	assistedCorrect: number
	lastSeenAt: string | null
}

export type ElementStatsMap = Record<string, ElementPerformance>

export function createEmptyElementPerformance(): ElementPerformance {
	return {
		shown: 0,
		correct: 0,
		wrong: 0,
		assistedCorrect: 0,
		lastSeenAt: null,
	}
}

export type ElementOutcome = 'first_try_correct' | 'wrong' | 'assisted_correct'

/**
 * Apply a finalized question outcome to one element's stats (idempotent caller).
 */
export function applyElementOutcome(
	previous: ElementPerformance | undefined,
	outcome: ElementOutcome,
	nowIso: string = new Date().toISOString(),
): ElementPerformance {
	const base = previous ?? createEmptyElementPerformance()
	const next: ElementPerformance = {
		...base,
		shown: base.shown + 1,
		lastSeenAt: nowIso,
	}
	if (outcome === 'first_try_correct') {
		next.correct = base.correct + 1
	} else if (outcome === 'wrong') {
		next.wrong = base.wrong + 1
	} else {
		next.assistedCorrect = base.assistedCorrect + 1
	}
	return next
}

/**
 * Deterministic weakness score. Unseen elements score 0 (not auto-weak).
 */
export function weaknessScore(stats: ElementPerformance): number {
	if (stats.shown <= 0) {
		return 0
	}
	const wrongRatio = stats.wrong / stats.shown
	const assistedRatio = stats.assistedCorrect / stats.shown
	const accuracy =
		stats.shown === 0
			? 1
			: stats.correct / Math.max(stats.shown - stats.assistedCorrect, 1)

	let score = wrongRatio * 10 + assistedRatio * 4
	if (stats.wrong > 0) {
		score += 2
	}
	if (stats.assistedCorrect > 0) {
		score += 1.5
	}
	if (stats.shown >= 3 && accuracy < 0.5) {
		score += 3
	}
	return score
}

/**
 * True when the element belongs in the weak training pool.
 */
export function isWeakElement(stats: ElementPerformance): boolean {
	if (stats.wrong > 0 || stats.assistedCorrect > 0) {
		return true
	}
	if (stats.shown >= 3) {
		const firstTryShown = stats.shown - stats.assistedCorrect
		const accuracy =
			firstTryShown <= 0 ? 0 : stats.correct / firstTryShown
		return accuracy < 0.5
	}
	return false
}

/**
 * Rank weak atomic numbers (highest weakness first). Ties broken by atomic number.
 */
export function rankWeakAtomicNumbers(
	elementStats: ElementStatsMap,
	rng?: () => number,
): number[] {
	const entries = Object.entries(elementStats)
		.map(([key, stats]) => ({
			atomicNumber: Number(key),
			stats,
			score: weaknessScore(stats),
		}))
		.filter(
			(entry) =>
				Number.isFinite(entry.atomicNumber) &&
				isWeakElement(entry.stats) &&
				entry.score > 0,
		)
		.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score
			}
			return a.atomicNumber - b.atomicNumber
		})

	if (!rng || entries.length < 2) {
		return entries.map((entry) => entry.atomicNumber)
	}

	// Light shuffle among near-tied top scores for session variety.
	const result = [...entries]
	for (let i = 0; i < Math.min(5, result.length - 1); i += 1) {
		if (Math.abs(result[i]!.score - result[i + 1]!.score) < 0.75 && rng() < 0.35) {
			const tmp = result[i]!
			result[i] = result[i + 1]!
			result[i + 1] = tmp
		}
	}
	return result.map((entry) => entry.atomicNumber)
}

/** Minimum distinct weak elements required to start Weak Elements mode. */
export const WEAK_POOL_MIN_SIZE = 3

export interface WeakModeAvailability {
	available: boolean
	poolSize: number
	atomicNumbers: number[]
}

/**
 * Check whether Weak Elements has enough data to start a session.
 */
export function getWeakModeAvailability(
	elementStats: ElementStatsMap,
): WeakModeAvailability {
	const atomicNumbers = rankWeakAtomicNumbers(elementStats)
	return {
		available: atomicNumbers.length >= WEAK_POOL_MIN_SIZE,
		poolSize: atomicNumbers.length,
		atomicNumbers,
	}
}
