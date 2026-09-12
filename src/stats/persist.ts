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
	DAILY_COMPLETION_BONUS,
	applyDailyCompletion,
	isDailyCompleted,
} from '../daily'
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
	/** Daily challenge date key when mode is DAILY. */
	dailyDateKey: string | null
	/** First completion of that Daily date (bonus/streak eligible). */
	isDailyFirstCompletion: boolean
	dailyBonusGranted: number
	dailyCurrentStreak: number
	dailyStreakGrew: boolean
	dailyNewStreakStarted: boolean
	isDailyReplay: boolean
}

const EMPTY_DAILY_META = {
	dailyDateKey: null as string | null,
	isDailyFirstCompletion: false,
	dailyBonusGranted: 0,
	dailyCurrentStreak: 0,
	dailyStreakGrew: false,
	dailyNewStreakStarted: false,
	isDailyReplay: false,
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
			...EMPTY_DAILY_META,
			dailyDateKey: session.challengeDateKey,
			dailyCurrentStreak: current.daily.currentStreak,
			isDailyReplay:
				modeId === 'DAILY' &&
				session.challengeDateKey != null &&
				isDailyCompleted(current.daily, session.challengeDateKey),
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
				...EMPTY_DAILY_META,
				dailyDateKey: session.challengeDateKey,
				dailyCurrentStreak: current.daily.currentStreak,
			}
		}

		const isElementTraining = modeId === 'ELEMENT_TRAINING'
		const isDaily = modeId === 'DAILY'
		const dailyDateKey = session.challengeDateKey
		const isDailyReplay =
			isDaily &&
			dailyDateKey != null &&
			isDailyCompleted(current.daily, dailyDateKey)
		const isDailyFirstCompletion =
			isDaily && !isDailyReplay && dailyDateKey != null

		const applied = isElementTraining
			? {
					previousBestScore: previous.bestScore,
					isNewBestScore: false,
					statistics: {
						...previous,
						gamesPlayed: previous.gamesPlayed + 1,
						questionsAnswered:
							previous.questionsAnswered + summary.questionCount,
						correctAnswers:
							previous.correctAnswers + summary.correctCount,
						totalWrong: previous.totalWrong + summary.wrongCount,
						bestStreak: Math.max(
							previous.bestStreak,
							summary.bestStreak,
						),
						hintsUsed: { ...previous.hintsUsed },
					},
				}
			: applyCompletedSessionToStatistics(previous, summary)

		const modeApplied = isElementTraining
			? {
					stats: current.modeStats[modeId] ?? {
						gamesPlayed: 0,
						bestScore: 0,
						bestCorrect: 0,
						bestStreak: 0,
						bestAccuracy: 0,
					},
					isNewRecord: false,
					previousRecord: 0,
				}
			: applyModeSessionToStats(
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
			isElementTraining || isDailyReplay
				? false
				: modeId === 'CLASSIC'
					? applied.isNewBestScore
					: modeApplied.isNewRecord

		let breakdown = calculateAtomRewards({
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

		let dailyBonusGranted = 0
		if (isDailyReplay) {
			breakdown = {
				baseCorrect: 0,
				streakBonuses: 0,
				completion: 0,
				perfect: 0,
				newRecord: 0,
				total: 0,
			}
		} else if (isDailyFirstCompletion) {
			dailyBonusGranted = DAILY_COMPLETION_BONUS
			breakdown = {
				...breakdown,
				total: breakdown.total + dailyBonusGranted,
			}
		}

		const earned = earnAtoms(
			toEconomyWallet(current.atoms),
			breakdown.total,
			'session_reward',
		)

		const completedAt = new Date().toISOString()
		let nextDaily = current.daily
		let dailyMeta = {
			...EMPTY_DAILY_META,
			dailyDateKey,
			isDailyFirstCompletion: Boolean(isDailyFirstCompletion),
			dailyBonusGranted,
			dailyCurrentStreak: current.daily.currentStreak,
			isDailyReplay: Boolean(isDailyReplay),
		}

		if (isDaily && dailyDateKey) {
			const dailyResult = applyDailyCompletion(current.daily, {
				dateKey: dailyDateKey,
				score: summary.score,
				correct: summary.correctCount,
				total: summary.questionCount,
				bestStreak: summary.bestStreak,
				accuracy: summary.accuracy,
				atomsEarned: breakdown.total,
				bonusGranted: Boolean(isDailyFirstCompletion),
				completedAt,
			})
			nextDaily = dailyResult.state
			dailyMeta = {
				dailyDateKey,
				isDailyFirstCompletion: dailyResult.isFirstCompletion,
				dailyBonusGranted,
				dailyCurrentStreak: dailyResult.currentStreak,
				dailyStreakGrew: dailyResult.streakGrew,
				dailyNewStreakStarted: dailyResult.newStreakStarted,
				isDailyReplay: !dailyResult.isFirstCompletion,
			}
		}

		const nextModeStats = isElementTraining
			? current.modeStats
			: {
					...current.modeStats,
					[modeId]: modeApplied.stats,
				}

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
			modeStats: nextModeStats,
			daily: nextDaily,
		}
		await saveAppState(nextState, storage)

		return {
			...applied,
			previousBestScore: isElementTraining
				? previous.bestScore
				: modeApplied.previousRecord,
			isNewBestScore,
			summary,
			persisted: true,
			atomsEarned: breakdown.total,
			atomBalance: earned.wallet.balance,
			rewardBreakdown: breakdown,
			modeId,
			isNewModeRecord:
				isElementTraining || isDailyReplay
					? false
					: modeApplied.isNewRecord,
			endReason: session.endReason,
			...dailyMeta,
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
			...EMPTY_DAILY_META,
			dailyDateKey: session.challengeDateKey,
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

export async function loadDailyState(storage?: KeyValueStorage) {
	try {
		const state = await loadAppState(storage)
		return state.daily
	} catch {
		return createDefaultPersistedState().daily
	}
}
