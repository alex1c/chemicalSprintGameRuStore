import type { GameModeId } from '../modes'

/**
 * Shared ads domain types (policy + runtime results).
 */

export type InterstitialShowResult = 'shown' | 'skipped' | 'failed'

export type RewardedShowResult =
	| 'rewarded'
	| 'closed_without_reward'
	| 'failed'
	| 'unavailable'
	| 'limit_reached'
	| 'busy'

export interface AdsPersistedState {
	/** Local calendar date key for rewarded counter (YYYY-MM-DD). */
	rewardedDateKey: string | null
	/** Confirmed rewarded completions for rewardedDateKey. */
	rewardedCompletedToday: number
	/**
	 * Eligible completed games since last interstitial show
	 * (or since install when never shown).
	 */
	completedGamesSinceInterstitial: number
	/** Lifetime eligible completed games (for firstEligibleAfterGames). */
	eligibleGamesCompleted: number
}

export interface InterstitialPolicyInput {
	modeId: GameModeId
	/** True when the session finished normally (not aborted). */
	completed: boolean
	eligibleGamesCompleted: number
	completedGamesSinceInterstitial: number
	interstitialShownThisSession: boolean
	firstEligibleAfterGames: number
	gamesBetweenInterstitial: number
	maxPerAppSession: number
}

export interface RewardedPolicyInput {
	dateKey: string
	rewardedDateKey: string | null
	rewardedCompletedToday: number
	dailyMax: number
}

export type RewardedCtaState =
	| 'loading'
	| 'ready'
	| 'unavailable'
	| 'limit_reached'
	| 'busy'
