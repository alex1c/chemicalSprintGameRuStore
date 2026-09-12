/**
 * Result CTA helper: optionally show interstitial, then navigate exactly once.
 */

import type { GameModeId } from '../modes'
import { trackEvent } from '../analytics'
import {
	defaultInterstitialPolicyFlags,
	recordInterstitialShown,
	shouldShowInterstitial,
} from './policy'
import { showInterstitialWithTimeout } from './interstitial'
import {
	hasInterstitialBeenShownThisSession,
	markInterstitialShownThisSession,
} from './session'
import type { AdsPersistedState, InterstitialShowResult } from './types'

export interface ResultExitAdPlan {
	shouldAttempt: boolean
	nextAdsState: AdsPersistedState
}

/**
 * Decide whether Result exit should attempt an interstitial (pure).
 */
export function planResultExitInterstitial(
	adsState: AdsPersistedState,
	modeId: GameModeId,
	completed: boolean,
): ResultExitAdPlan {
	const flags = defaultInterstitialPolicyFlags(
		adsState,
		modeId,
		completed,
		hasInterstitialBeenShownThisSession(),
	)
	const shouldAttempt = shouldShowInterstitial(flags)
	return {
		shouldAttempt,
		nextAdsState: adsState,
	}
}

/**
 * Run interstitial attempt then invoke navigate exactly once.
 * Guard against rapid double taps via `busyRef`.
 */
export async function runResultExitWithOptionalInterstitial(options: {
	adsState: AdsPersistedState
	modeId: GameModeId
	completed: boolean
	busyRef: { current: boolean }
	persistInterstitialShown: (
		next: AdsPersistedState,
	) => Promise<void>
	navigate: () => void
}): Promise<InterstitialShowResult | 'skipped'> {
	if (options.busyRef.current) {
		return 'skipped'
	}
	options.busyRef.current = true

	let navigated = false
	const go = () => {
		if (navigated) {
			return
		}
		navigated = true
		options.navigate()
	}

	try {
		const plan = planResultExitInterstitial(
			options.adsState,
			options.modeId,
			options.completed,
		)
		if (!plan.shouldAttempt) {
			go()
			return 'skipped'
		}

		const result = await showInterstitialWithTimeout()
		if (result === 'shown') {
			markInterstitialShownThisSession()
			const next = recordInterstitialShown(options.adsState)
			try {
				await options.persistInterstitialShown(next)
			} catch {
				// Persistence failure must not block navigation.
			}
			trackEvent('interstitial_shown', { mode: options.modeId })
		}
		go()
		return result
	} catch {
		go()
		return 'failed'
	}
}
