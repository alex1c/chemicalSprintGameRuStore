/**
 * Pure ad policy helpers — no SDK, no React, fully unit-testable.
 */

import type { GameModeId } from '../modes'
import {
	INTERSTITIAL_POLICY,
	REWARDED_DAILY_MAX,
} from './config'
import type {
	AdsPersistedState,
	InterstitialPolicyInput,
	RewardedPolicyInput,
} from './types'

/** Modes that may contribute to interstitial eligibility counters. */
export const INTERSTITIAL_ELIGIBLE_MODES: readonly GameModeId[] = [
	'CLASSIC',
	'MIXED',
	'TIMED_60',
	'NO_MISTAKE',
	'WEAK_ELEMENTS',
] as const

export function isInterstitialEligibleMode(modeId: GameModeId): boolean {
	return (INTERSTITIAL_ELIGIBLE_MODES as readonly string[]).includes(modeId)
}

/**
 * True when an interstitial has never been recorded (counters climb together).
 * After a show, completedGamesSinceInterstitial resets while lifetime stays.
 */
export function hasNeverShownInterstitial(state: AdsPersistedState): boolean {
	return (
		state.completedGamesSinceInterstitial === state.eligibleGamesCompleted
	)
}

/**
 * Whether an interstitial may be offered after Result CTA.
 *
 * First show: after firstEligibleAfterGames (default 3).
 * Later shows: after gamesBetweenInterstitial since last show (default 4).
 * Always: max once per app process session; Daily / training excluded.
 */
export function shouldShowInterstitial(
	input: InterstitialPolicyInput,
): boolean {
	if (!input.completed) {
		return false
	}
	if (!isInterstitialEligibleMode(input.modeId)) {
		return false
	}
	if (input.interstitialShownThisSession) {
		return false
	}
	if (input.maxPerAppSession <= 0) {
		return false
	}
	if (input.eligibleGamesCompleted < input.firstEligibleAfterGames) {
		return false
	}

	const neverShown =
		input.completedGamesSinceInterstitial === input.eligibleGamesCompleted
	if (neverShown) {
		return input.eligibleGamesCompleted >= input.firstEligibleAfterGames
	}

	return (
		input.completedGamesSinceInterstitial >= input.gamesBetweenInterstitial
	)
}

/**
 * Apply a completed eligible game to ads counters (pure).
 * Non-eligible / aborted sessions leave counters unchanged.
 */
export function recordCompletedGame(
	state: AdsPersistedState,
	modeId: GameModeId,
	completed: boolean,
): AdsPersistedState {
	if (!completed || !isInterstitialEligibleMode(modeId)) {
		return state
	}
	return {
		...state,
		eligibleGamesCompleted: state.eligibleGamesCompleted + 1,
		completedGamesSinceInterstitial:
			state.completedGamesSinceInterstitial + 1,
	}
}

/**
 * Reset interstitial cooldown after a successful show.
 */
export function recordInterstitialShown(
	state: AdsPersistedState,
): AdsPersistedState {
	return {
		...state,
		completedGamesSinceInterstitial: 0,
	}
}

/**
 * Normalize rewarded counters onto the current local calendar day.
 */
export function resolveRewardedDayState(
	state: AdsPersistedState,
	todayKey: string,
): AdsPersistedState {
	if (state.rewardedDateKey === todayKey) {
		return state
	}
	return {
		...state,
		rewardedDateKey: todayKey,
		rewardedCompletedToday: 0,
	}
}

export function getRewardedRemainingToday(
	input: RewardedPolicyInput,
): number {
	const completed =
		input.rewardedDateKey === input.dateKey
			? Math.max(0, input.rewardedCompletedToday)
			: 0
	return Math.max(0, input.dailyMax - completed)
}

export function canWatchRewarded(input: RewardedPolicyInput): boolean {
	return getRewardedRemainingToday(input) > 0
}

/**
 * Record one confirmed rewarded completion for today.
 * Caps at dailyMax (idempotent against over-count).
 */
export function recordRewardedCompletion(
	state: AdsPersistedState,
	todayKey: string,
	dailyMax: number = REWARDED_DAILY_MAX,
): AdsPersistedState {
	const day = resolveRewardedDayState(state, todayKey)
	if (day.rewardedCompletedToday >= dailyMax) {
		return day
	}
	return {
		...day,
		rewardedCompletedToday: day.rewardedCompletedToday + 1,
	}
}

export function createEmptyAdsState(): AdsPersistedState {
	return {
		rewardedDateKey: null,
		rewardedCompletedToday: 0,
		completedGamesSinceInterstitial: 0,
		eligibleGamesCompleted: 0,
	}
}

export function defaultInterstitialPolicyFlags(
	state: AdsPersistedState,
	modeId: GameModeId,
	completed: boolean,
	interstitialShownThisSession: boolean,
): InterstitialPolicyInput {
	return {
		modeId,
		completed,
		eligibleGamesCompleted: state.eligibleGamesCompleted,
		completedGamesSinceInterstitial: state.completedGamesSinceInterstitial,
		interstitialShownThisSession,
		firstEligibleAfterGames: INTERSTITIAL_POLICY.firstEligibleAfterGames,
		gamesBetweenInterstitial: INTERSTITIAL_POLICY.gamesBetweenInterstitial,
		maxPerAppSession: INTERSTITIAL_POLICY.maxPerAppSession,
	}
}
