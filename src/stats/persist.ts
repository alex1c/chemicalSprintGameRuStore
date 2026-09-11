import type { GameSession } from '../game'
import {
	createDefaultPersistedState,
	DEFAULT_STATISTICS,
	loadAppState,
	saveAppState,
	type AppStatistics,
	type KeyValueStorage,
	type PersistedAppState,
} from '../storage'
import {
	applyCompletedSessionToStatistics,
	summarizeCompletedSession,
	type AppliedSessionStats,
	type CompletedSessionSummary,
} from './sessionStats'

export interface PersistCompletedSessionResult extends AppliedSessionStats {
	summary: CompletedSessionSummary
	/** False when persistence failed; in-memory merge still returned. */
	persisted: boolean
}

/**
 * Apply a finished classic sprint to local statistics and persist safely.
 * Storage failures never throw to the UI layer.
 */
export async function persistCompletedSessionStats(
	session: GameSession,
	storage?: KeyValueStorage,
): Promise<PersistCompletedSessionResult> {
	const summary = summarizeCompletedSession(session)
	let previous: AppStatistics = { ...DEFAULT_STATISTICS }

	try {
		const current = await loadAppState(storage)
		previous = current.statistics
		const applied = applyCompletedSessionToStatistics(previous, summary)
		const nextState: PersistedAppState = {
			...current,
			statistics: applied.statistics,
		}
		await saveAppState(nextState, storage)
		return {
			...applied,
			summary,
			persisted: true,
		}
	} catch {
		const applied = applyCompletedSessionToStatistics(previous, summary)
		return {
			...applied,
			summary,
			persisted: false,
		}
	}
}

/**
 * Load home-screen statistics with safe defaults on failure.
 */
export async function loadHomeStatistics(
	storage?: KeyValueStorage,
): Promise<AppStatistics> {
	try {
		const state = await loadAppState(storage)
		return state.statistics
	} catch {
		return { ...createDefaultPersistedState().statistics }
	}
}
