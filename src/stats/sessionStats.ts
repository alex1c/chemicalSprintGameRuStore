import type { AppStatistics } from '../storage/schema'
import type { GameSession } from '../game/types'
import { getGameModeConfig } from '../modes'

/**
 * Snapshot of a finished classic sprint used for persistence and Result UI.
 */
export interface CompletedSessionSummary {
	score: number
	correctCount: number
	wrongCount: number
	questionCount: number
	bestStreak: number
	accuracy: number
}

/**
 * Build a completed-session summary from the engine session.
 */
export function summarizeCompletedSession(
	session: GameSession,
): CompletedSessionSummary {
	const answeredCount = session.answers.length
	const accuracy =
		answeredCount === 0 ? 0 : session.correctCount / answeredCount
	const mode = getGameModeConfig(session.modeId)
	const questionCount =
		mode.endCondition === 'fixed_count'
			? session.questionCount
			: answeredCount

	return {
		score: session.score,
		correctCount: session.correctCount,
		wrongCount: session.wrongCount,
		questionCount,
		bestStreak: session.bestStreak,
		accuracy,
	}
}

export interface AppliedSessionStats {
	statistics: AppStatistics
	/** True when this session score beats the previous bestScore. */
	isNewBestScore: boolean
	/** Best score before applying this session. */
	previousBestScore: number
}

/**
 * Pure merge of a completed session into persisted statistics.
 * Incomplete sessions must never call this helper.
 */
export function applyCompletedSessionToStatistics(
	previous: AppStatistics,
	summary: CompletedSessionSummary,
): AppliedSessionStats {
	const previousBestScore = previous.bestScore
	const isNewBestScore = summary.score > previousBestScore

	return {
		previousBestScore,
		isNewBestScore,
		statistics: {
			gamesPlayed: previous.gamesPlayed + 1,
			questionsAnswered:
				previous.questionsAnswered + summary.questionCount,
			correctAnswers: previous.correctAnswers + summary.correctCount,
			totalWrong: previous.totalWrong + summary.wrongCount,
			bestScore: Math.max(previous.bestScore, summary.score),
			bestAccuracy: Math.max(previous.bestAccuracy, summary.accuracy),
			bestStreak: Math.max(previous.bestStreak, summary.bestStreak),
			totalAtomsEarned: previous.totalAtomsEarned,
			totalAtomsSpent: previous.totalAtomsSpent,
			hintsUsed: { ...previous.hintsUsed },
		},
	}
}
