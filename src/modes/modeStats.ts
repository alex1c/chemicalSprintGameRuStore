import { getGameModeConfig } from './config'
import type { GameModeId } from './types'

export interface ModeStats {
	gamesPlayed: number
	bestScore: number
	bestCorrect: number
	bestStreak: number
	bestAccuracy: number
}

export type ModeStatsMap = Record<GameModeId, ModeStats>

export function createEmptyModeStats(): ModeStats {
	return {
		gamesPlayed: 0,
		bestScore: 0,
		bestCorrect: 0,
		bestStreak: 0,
		bestAccuracy: 0,
	}
}

export function createDefaultModeStatsMap(): ModeStatsMap {
	return {
		CLASSIC: createEmptyModeStats(),
		TIMED_60: createEmptyModeStats(),
		NO_MISTAKE: createEmptyModeStats(),
		MIXED: createEmptyModeStats(),
		WEAK_ELEMENTS: createEmptyModeStats(),
		ELEMENT_TRAINING: createEmptyModeStats(),
		DAILY: createEmptyModeStats(),
	}
}

export interface ModeSessionSummary {
	score: number
	correctCount: number
	bestStreak: number
	accuracy: number
}

/**
 * Merge a finished session into per-mode records.
 * Primary record field comes from GameModeConfig.
 */
export function applyModeSessionToStats(
	previous: ModeStats,
	summary: ModeSessionSummary,
	modeId: GameModeId,
): { stats: ModeStats; isNewRecord: boolean; previousRecord: number } {
	const recordField = getGameModeConfig(modeId).recordField
	const previousRecord =
		recordField === 'bestCorrect' ? previous.bestCorrect : previous.bestScore
	const currentRecord =
		recordField === 'bestCorrect' ? summary.correctCount : summary.score
	const isNewRecord = currentRecord > previousRecord

	return {
		isNewRecord,
		previousRecord,
		stats: {
			gamesPlayed: previous.gamesPlayed + 1,
			bestScore: Math.max(previous.bestScore, summary.score),
			bestCorrect: Math.max(previous.bestCorrect, summary.correctCount),
			bestStreak: Math.max(previous.bestStreak, summary.bestStreak),
			bestAccuracy: Math.max(previous.bestAccuracy, summary.accuracy),
		},
	}
}
