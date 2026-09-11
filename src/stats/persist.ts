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
 * Apply a finished classic sprint to local statistics + atom rewards.
 * Idempotent via session.extensions.rewardsCommitted.
 * Storage failures never throw to the UI layer.
 */
export async function persistCompletedSessionStats(
	session: GameSession,
	storage?: KeyValueStorage,
): Promise<PersistCompletedSessionResult> {
	const summary = summarizeCompletedSession(session)
	let previous: AppStatistics = { ...DEFAULT_STATISTICS }
	let previousAtoms = createDefaultPersistedState().atoms

	const emptyBreakdown = calculateAtomRewards({
		correctCount: summary.correctCount,
		wrongCount: summary.wrongCount,
		questionCount: summary.questionCount,
		bestStreak: summary.bestStreak,
		isNewBestScore: false,
	})

	if (session.extensions.rewardsCommitted) {
		return {
			previousBestScore: previous.bestScore,
			isNewBestScore: false,
			statistics: previous,
			summary,
			persisted: true,
			atomsEarned: session.extensions.atomsEarned,
			atomBalance: previousAtoms.balance,
			rewardBreakdown: {
				...emptyBreakdown,
				total: session.extensions.atomsEarned,
			},
		}
	}

	try {
		const current = await loadAppState(storage)
		previous = current.statistics
		previousAtoms = current.atoms
		const applied = applyCompletedSessionToStatistics(previous, summary)

		const breakdown = calculateAtomRewards({
			correctCount: summary.correctCount,
			wrongCount: summary.wrongCount,
			questionCount: summary.questionCount,
			bestStreak: summary.bestStreak,
			isNewBestScore: applied.isNewBestScore,
		})

		const earned = earnAtoms(
			toEconomyWallet(current.atoms),
			breakdown.total,
			'session_reward',
		)

		const nextState: PersistedAppState = {
			...current,
			statistics: {
				...applied.statistics,
				totalAtomsEarned:
					applied.statistics.totalAtomsEarned + breakdown.total,
			},
			atoms: toPersistedAtoms(earned.wallet),
		}
		await saveAppState(nextState, storage)

		return {
			...applied,
			summary,
			persisted: true,
			atomsEarned: breakdown.total,
			atomBalance: earned.wallet.balance,
			rewardBreakdown: breakdown,
		}
	} catch {
		const applied = applyCompletedSessionToStatistics(previous, summary)
		const breakdown = calculateAtomRewards({
			correctCount: summary.correctCount,
			wrongCount: summary.wrongCount,
			questionCount: summary.questionCount,
			bestStreak: summary.bestStreak,
			isNewBestScore: applied.isNewBestScore,
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
		}
	}
}

/**
 * Commit rewards once and return the marked session for callers that keep state.
 */
export function commitSessionAtomRewards(
	session: GameSession,
	atomsEarned: number,
): GameSession {
	return markRewardsCommitted(session, atomsEarned)
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

/**
 * Load wallet balance for Home / Game chips.
 */
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
