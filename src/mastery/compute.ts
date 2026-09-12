import {
	createEmptyElementPerformance,
	isWeakElement,
	type ElementPerformance,
	type ElementStatsMap,
} from '../modes/elementPerformance'
import {
	MASTERY_CONFIG,
	MASTERY_LEVELS,
	type MasteryLevel,
} from './config'

/**
 * First-try accuracy = correct / shown (assisted and wrong dilute this).
 * Returns 0 when the element was never shown.
 */
export function getFirstTryAccuracy(stats: ElementPerformance): number {
	if (stats.shown <= 0) {
		return 0
	}
	return stats.correct / stats.shown
}

/**
 * Weighted accuracy treating assistedCorrect as a partial success.
 */
export function getEffectiveAccuracy(stats: ElementPerformance): number {
	if (stats.shown <= 0) {
		return 0
	}
	const effectiveCorrect =
		stats.correct +
		stats.assistedCorrect * MASTERY_CONFIG.assistedCorrectWeight
	return Math.min(1, effectiveCorrect / stats.shown)
}

/**
 * Derive mastery from current element performance (supports regression).
 */
export function getElementMastery(
	stats: ElementPerformance | undefined | null,
): MasteryLevel {
	const s = stats ?? createEmptyElementPerformance()
	if (s.shown <= 0) {
		return 'UNSEEN'
	}

	const firstTry = getFirstTryAccuracy(s)
	const effective = getEffectiveAccuracy(s)
	const wrongRatio = s.wrong / s.shown
	const assistedRatio = s.assistedCorrect / s.shown
	const { mastered, familiar } = MASTERY_CONFIG

	const canMaster =
		s.shown >= mastered.minShown &&
		firstTry >= mastered.minFirstTryAccuracy &&
		wrongRatio <= mastered.maxWrongRatio &&
		assistedRatio <= mastered.maxAssistedRatio

	if (canMaster) {
		return 'MASTERED'
	}

	const canFamiliar =
		s.shown >= familiar.minShown &&
		effective >= familiar.minEffectiveAccuracy

	if (canFamiliar) {
		return 'FAMILIAR'
	}

	return 'LEARNING'
}

export interface MasterySummary {
	total: number
	unseen: number
	learning: number
	familiar: number
	mastered: number
	/** mastered / total in [0, 1]. */
	progressRatio: number
	/** 0–100 percentage of mastered elements. */
	progressPercent: number
}

/**
 * Count mastery levels across all 118 elements (missing stats = UNSEEN).
 */
export function getMasterySummary(
	elementStats: ElementStatsMap,
	totalElements: number = 118,
): MasterySummary {
	const counts: Record<MasteryLevel, number> = {
		UNSEEN: 0,
		LEARNING: 0,
		FAMILIAR: 0,
		MASTERED: 0,
	}

	for (let atomic = 1; atomic <= totalElements; atomic += 1) {
		const level = getElementMastery(elementStats[String(atomic)])
		counts[level] += 1
	}

	const mastered = counts.MASTERED
	const progressRatio = totalElements === 0 ? 0 : mastered / totalElements

	return {
		total: totalElements,
		unseen: counts.UNSEEN,
		learning: counts.LEARNING,
		familiar: counts.FAMILIAR,
		mastered,
		progressRatio,
		progressPercent: Math.round(progressRatio * 100),
	}
}

export function getProgressPercentage(
	elementStats: ElementStatsMap,
	totalElements: number = 118,
): number {
	return getMasterySummary(elementStats, totalElements).progressPercent
}

export type ProgressFilter =
	| 'ALL'
	| MasteryLevel
	| 'WEAK'

/**
 * Filter atomic numbers by mastery level or weakness.
 */
export function getElementsByMastery(
	elementStats: ElementStatsMap,
	filter: ProgressFilter,
	totalElements: number = 118,
): number[] {
	const result: number[] = []
	for (let atomic = 1; atomic <= totalElements; atomic += 1) {
		const key = String(atomic)
		const stats = elementStats[key]
		if (filter === 'ALL') {
			result.push(atomic)
			continue
		}
		if (filter === 'WEAK') {
			if (stats && isWeakElement(stats)) {
				result.push(atomic)
			}
			continue
		}
		if (getElementMastery(stats) === filter) {
			result.push(atomic)
		}
	}
	return result
}

/** Invariant helper: outcome buckets should sum to shown. */
export function outcomesSumToShown(stats: ElementPerformance): boolean {
	return (
		stats.shown ===
		stats.correct + stats.wrong + stats.assistedCorrect
	)
}

export function assertMasteryLevelsCoverAll(): readonly MasteryLevel[] {
	return MASTERY_LEVELS
}
