import type { GameSession } from '../game'
import { markRewardsCommitted } from '../game'
import {
	calculateAtomRewards,
	earnAtoms,
	spendAtoms,
	type AtomRewardBreakdown,
	type AtomSpendReason,
	type AtomWalletState,
} from '../economy'
import {
	applyElementOutcome,
	applyModeSessionToStats,
	type ElementOutcome,
	type ElementStatsMap,
	type GameModeId,
} from '../modes'
import {
	createDefaultPersistedState,
	DEFAULT_STATISTICS,
	loadAppState,
	saveAppState,
	type AppStatistics,
	type AtomsWallet,
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
	atomsEarned: number
	atomBalance: number
	rewardBreakdown: AtomRewardBreakdown
	modeId: GameModeId
	isNewModeRecord: boolean
	endReason: string | null
}

export function toEconomyWallet(atoms: AtomsWallet): AtomWalletState {
	return {
		balance: atoms.balance,
		lifetimeEarned: atoms.lifetimeEarned,
		lifetimeSpent: atoms.lifetimeSpent,
		startingGranted: atoms.startingGranted,
	}
}

export function toPersistedAtoms(wallet: AtomWalletState): AtomsWallet {
	return {
		balance: wallet.balance,
		lifetimeEarned: wallet.lifetimeEarned,
		lifetimeSpent: wallet.lifetimeSpent,
		startingGranted: wallet.startingGranted,
	}
}

/**
 * Immediately persist a hint spend. Never throws.
 */
export async function persistAtomSpend(
	amount: number,
	reason: AtomSpendReason,
	hintKey?: 'fiftyFifty' | 'fact' | 'secondChance' | 'saveStreak',
	storage?: KeyValueStorage,
): Promise<{ ok: boolean; wallet: AtomWalletState }> {
	try {
		const current = await loadAppState(storage)
		const spend = spendAtoms(toEconomyWallet(current.atoms), amount, reason)
		if (!spend.ok) {
			return { ok: false, wallet: toEconomyWallet(current.atoms) }
		}

		const hintsUsed = { ...current.statistics.hintsUsed }
		if (hintKey) {
			hintsUsed[hintKey] = hintsUsed[hintKey] + 1
			hintsUsed.total = hintsUsed.total + 1
		}

		const nextState: PersistedAppState = {
			...current,
			atoms: toPersistedAtoms(spend.wallet),
			statistics: {
				...current.statistics,
				totalAtomsSpent: current.statistics.totalAtomsSpent + amount,
				hintsUsed,
			},
		}
		await saveAppState(nextState, storage)
		return { ok: true, wallet: spend.wallet }
	} catch {
		return {
			ok: false,
			wallet: toEconomyWallet(createDefaultPersistedState().atoms),
		}
	}
}

/**
 * Build element-stat updates from finalized session answers.
 */
export function buildElementStatsUpdates(
	session: GameSession,
	previous: ElementStatsMap,
): ElementStatsMap {
	const next: ElementStatsMap = { ...previous }
	for (const answer of session.answers) {
		const key = String(answer.elementAtomicNumber)
		let outcome: ElementOutcome
		if (answer.correct && answer.usedSecondChance) {
			outcome = 'assisted_correct'
		} else if (answer.correct) {
			outcome = 'first_try_correct'
		} else {
			outcome = 'wrong'
		}
		next[key] = applyElementOutcome(next[key], outcome)
	}
	return next
}

let completionCommitQueue: Promise<void> = Promise.resolve()

async function persistCompletedSessionStatsUnlocked(
	session: GameSession,
	storage?: KeyValueStorage,
): Promise<PersistCompletedSessionResult> {
	const summary = summarizeCompletedSession(session)
	const modeId = session.modeId
	let previous: AppStatistics = { ...DEFAULT_STATISTICS }
	let previousAtoms = createDefaultPersistedState().atoms

	const emptyBreakdown = calculateAtomRewards({
		correctCount: summary.correctCount,
		wrongCount: summary.wrongCount,
		questionCount: summary.questionCount,
		bestStreak: summary.bestStreak,
		isNewBestScore: false,
		modeId,
		sessionCompleted: true,
	})

	if (session.extensions.rewardsCommitted) {
		const current = await loadAppState(storage)
		return {
			previousBestScore: current.statistics.bestScore,
			isNewBestScore: false,
			statistics: current.statistics,
			summary,
			persisted: true,
			atomsEarned: 0,
			atomBalance: current.atoms.balance,
			rewardBreakdown: { ...emptyBreakdown, total: 0 },
			modeId,
			isNewModeRecord: false,
			endReason: session.endReason,
		}
	}

	try {
		const current = await loadAppState(storage)
		previous = current.statistics
		previousAtoms = current.atoms
		if (current.completedSessionIds.includes(session.id)) {
			return {
				previousBestScore: current.statistics.bestScore,
				isNewBestScore: false,
				statistics: current.statistics,
				summary,
				persisted: true,
				atomsEarned: 0,
				atomBalance: current.atoms.balance,
				rewardBreakdown: { ...emptyBreakdown, total: 0 },
				modeId,
				isNewModeRecord: false,
				endReason: session.endReason,
			}
		}

		const applied = applyCompletedSessionToStatistics(previous, summary)
		const modeApplied = applyModeSessionToStats(
			current.modeStats[modeId],
			{
				score: summary.score,
				correctCount: summary.correctCount,
				bestStreak: summary.bestStreak,
				accuracy: summary.accuracy,
			},
			modeId,
		)

		const isNewBestScore =
			modeId === 'CLASSIC'
				? applied.isNewBestScore
				: modeApplied.isNewRecord

		const breakdown = calculateAtomRewards({
			correctCount: summary.correctCount,
			wrongCount: summary.wrongCount,
			questionCount:
				session.modeId === 'TIMED_60' || session.modeId === 'NO_MISTAKE'
					? summary.correctCount + summary.wrongCount
					: summary.questionCount,
			bestStreak: summary.bestStreak,
			isNewBestScore,
			modeId,
			sessionCompleted: true,
		})

		const earned = earnAtoms(
			toEconomyWallet(current.atoms),
			breakdown.total,
			'session_reward',
		)

		const nextState: PersistedAppState = {
			...current,
			completedSessionIds: [...current.completedSessionIds, session.id],
			statistics: {
				...applied.statistics,
				totalAtomsEarned:
					applied.statistics.totalAtomsEarned + breakdown.total,
			},
			atoms: toPersistedAtoms(earned.wallet),
			elementStats: buildElementStatsUpdates(session, current.elementStats),
			modeStats: {
				...current.modeStats,
				[modeId]: modeApplied.stats,
			},
		}
		await saveAppState(nextState, storage)

		return {
			...applied,
			previousBestScore: modeApplied.previousRecord,
			isNewBestScore,
			summary,
			persisted: true,
			atomsEarned: breakdown.total,
			atomBalance: earned.wallet.balance,
			rewardBreakdown: breakdown,
			modeId,
			isNewModeRecord: modeApplied.isNewRecord,
			endReason: session.endReason,
		}
	} catch {
		const applied = applyCompletedSessionToStatistics(previous, summary)
		const breakdown = calculateAtomRewards({
			correctCount: summary.correctCount,
			wrongCount: summary.wrongCount,
			questionCount: summary.questionCount,
			bestStreak: summary.bestStreak,
			isNewBestScore: applied.isNewBestScore,
			modeId,
			sessionCompleted: true,
		})
		const earned = earnAtoms(
			toEconomyWallet(previousAtoms),
			breakdown.total,
			'session_reward',
		)
		return {
			...applied,
			summary,
			persisted: false,
			atomsEarned: breakdown.total,
			atomBalance: earned.wallet.balance,
			rewardBreakdown: breakdown,
			modeId,
			isNewModeRecord: false,
			endReason: session.endReason,
		}
	}
}

/**
 * Serialize local completion commits so simultaneous lifecycle callbacks
 * cannot both observe an uncommitted session id.
 */
export async function persistCompletedSessionStats(
	session: GameSession,
	storage?: KeyValueStorage,
): Promise<PersistCompletedSessionResult> {
	const previousCommit = completionCommitQueue
	let release!: () => void
	completionCommitQueue = new Promise<void>((resolve) => {
		release = resolve
	})
	await previousCommit
	try {
		return await persistCompletedSessionStatsUnlocked(session, storage)
	} finally {
		release()
	}
}

export function commitSessionAtomRewards(
	session: GameSession,
	atomsEarned: number,
): GameSession {
	return markRewardsCommitted(session, atomsEarned)
}

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

export async function loadAtomWallet(
	storage?: KeyValueStorage,
): Promise<AtomWalletState> {
	try {
		const state = await loadAppState(storage)
		return toEconomyWallet(state.atoms)
	} catch {
		return toEconomyWallet(createDefaultPersistedState().atoms)
	}
}

export async function loadModeStats(storage?: KeyValueStorage) {
	try {
		const state = await loadAppState(storage)
		return state.modeStats
	} catch {
		return createDefaultPersistedState().modeStats
	}
}

export async function loadElementStats(storage?: KeyValueStorage) {
	try {
		const state = await loadAppState(storage)
		return state.elementStats
	} catch {
		return {}
	}
}
