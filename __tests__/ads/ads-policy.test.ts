import {
	canWatchRewarded,
	createEmptyAdsState,
	defaultInterstitialPolicyFlags,
	getRewardedRemainingToday,
	hasNeverShownInterstitial,
	isInterstitialEligibleMode,
	recordCompletedGame,
	recordInterstitialShown,
	recordRewardedCompletion,
	resolveRewardedDayState,
	shouldShowInterstitial,
} from '../../src/ads/policy'
import { planResultExitInterstitial } from '../../src/ads/resultFlow'
import {
	hasInterstitialBeenShownThisSession,
	markInterstitialShownThisSession,
	resetInterstitialSessionForTests,
} from '../../src/ads/session'
import { INTERSTITIAL_POLICY, REWARDED_DAILY_MAX } from '../../src/ads/config'

describe('interstitial policy', () => {
	beforeEach(() => {
		resetInterstitialSessionForTests()
	})

	it('excludes Daily and Element Training', () => {
		expect(isInterstitialEligibleMode('DAILY')).toBe(false)
		expect(isInterstitialEligibleMode('ELEMENT_TRAINING')).toBe(false)
		expect(isInterstitialEligibleMode('CLASSIC')).toBe(true)
	})

	it('does not show on first games', () => {
		let state = createEmptyAdsState()
		state = recordCompletedGame(state, 'CLASSIC', true)
		state = recordCompletedGame(state, 'CLASSIC', true)
		const flags = defaultInterstitialPolicyFlags(
			state,
			'CLASSIC',
			true,
			false,
		)
		expect(shouldShowInterstitial(flags)).toBe(false)
	})

	it('becomes eligible after threshold', () => {
		let state = createEmptyAdsState()
		state = recordCompletedGame(state, 'MIXED', true)
		state = recordCompletedGame(state, 'TIMED_60', true)
		state = recordCompletedGame(state, 'NO_MISTAKE', true)
		expect(state.eligibleGamesCompleted).toBe(3)
		expect(hasNeverShownInterstitial(state)).toBe(true)
		expect(
			shouldShowInterstitial(
				defaultInterstitialPolicyFlags(state, 'CLASSIC', true, false),
			),
		).toBe(true)
	})

	it('respects max once per app session', () => {
		let state = createEmptyAdsState()
		for (let i = 0; i < 3; i += 1) {
			state = recordCompletedGame(state, 'CLASSIC', true)
		}
		markInterstitialShownThisSession()
		expect(hasInterstitialBeenShownThisSession()).toBe(true)
		expect(
			shouldShowInterstitial(
				defaultInterstitialPolicyFlags(state, 'CLASSIC', true, true),
			),
		).toBe(false)
	})

	it('respects cooldown after a show', () => {
		let state = createEmptyAdsState()
		for (let i = 0; i < 3; i += 1) {
			state = recordCompletedGame(state, 'WEAK_ELEMENTS', true)
		}
		state = recordInterstitialShown(state)
		expect(state.completedGamesSinceInterstitial).toBe(0)
		state = recordCompletedGame(state, 'CLASSIC', true)
		state = recordCompletedGame(state, 'CLASSIC', true)
		state = recordCompletedGame(state, 'CLASSIC', true)
		expect(
			shouldShowInterstitial(
				defaultInterstitialPolicyFlags(state, 'CLASSIC', true, false),
			),
		).toBe(false)
		state = recordCompletedGame(state, 'CLASSIC', true)
		expect(state.completedGamesSinceInterstitial).toBe(
			INTERSTITIAL_POLICY.gamesBetweenInterstitial,
		)
		expect(
			shouldShowInterstitial(
				defaultInterstitialPolicyFlags(state, 'CLASSIC', true, false),
			),
		).toBe(true)
	})

	it('ignores aborted and excluded modes for counters', () => {
		let state = createEmptyAdsState()
		state = recordCompletedGame(state, 'CLASSIC', false)
		state = recordCompletedGame(state, 'DAILY', true)
		state = recordCompletedGame(state, 'ELEMENT_TRAINING', true)
		expect(state.eligibleGamesCompleted).toBe(0)
	})

	it('plans Result exit without ad when not eligible', () => {
		const plan = planResultExitInterstitial(
			createEmptyAdsState(),
			'CLASSIC',
			true,
		)
		expect(plan.shouldAttempt).toBe(false)
	})
})

describe('rewarded policy', () => {
	it('limits to 3 per local day', () => {
		let state = createEmptyAdsState()
		const day = '2026-09-12'
		state = recordRewardedCompletion(state, day)
		state = recordRewardedCompletion(state, day)
		state = recordRewardedCompletion(state, day)
		expect(
			canWatchRewarded({
				dateKey: day,
				rewardedDateKey: state.rewardedDateKey,
				rewardedCompletedToday: state.rewardedCompletedToday,
				dailyMax: REWARDED_DAILY_MAX,
			}),
		).toBe(false)
		expect(
			getRewardedRemainingToday({
				dateKey: day,
				rewardedDateKey: state.rewardedDateKey,
				rewardedCompletedToday: state.rewardedCompletedToday,
				dailyMax: REWARDED_DAILY_MAX,
			}),
		).toBe(0)
	})

	it('resets on next local date key', () => {
		let state = createEmptyAdsState()
		state = recordRewardedCompletion(state, '2026-09-12')
		state = recordRewardedCompletion(state, '2026-09-12')
		state = recordRewardedCompletion(state, '2026-09-12')
		state = resolveRewardedDayState(state, '2026-09-13')
		expect(state.rewardedCompletedToday).toBe(0)
		expect(
			canWatchRewarded({
				dateKey: '2026-09-13',
				rewardedDateKey: state.rewardedDateKey,
				rewardedCompletedToday: state.rewardedCompletedToday,
				dailyMax: REWARDED_DAILY_MAX,
			}),
		).toBe(true)
	})

	it('does not over-count past daily max', () => {
		let state = createEmptyAdsState()
		const day = '2026-09-12'
		for (let i = 0; i < 10; i += 1) {
			state = recordRewardedCompletion(state, day)
		}
		expect(state.rewardedCompletedToday).toBe(REWARDED_DAILY_MAX)
	})
})
