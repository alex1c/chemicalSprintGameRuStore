/**
 * Rewarded ad bridge with exactly-once reward callback guard.
 */

import { REWARDED_ID } from './config'
import { getAdsSdk, initializeAdsSdk } from './sdk'
import type { RewardedShowResult } from './types'

type RewardedAd = import('yandex-mobile-ads').RewardedAd

let showBusy = false
/** In-memory guard: one reward grant per show attempt id. */
const consumedRewardIds = new Set<string>()
let rewardSeq = 0

/**
 * Show rewarded ad. Invokes onReward exactly once when SDK confirms reward.
 */
export async function showRewardedAd(options: {
	onReward: (rewardId: string) => Promise<void> | void
}): Promise<RewardedShowResult> {
	if (showBusy) {
		return 'busy'
	}
	showBusy = true
	const attemptId = `rw-${Date.now()}-${rewardSeq++}`

	try {
		const ok = await initializeAdsSdk()
		const sdk = getAdsSdk()
		if (!ok || !sdk) {
			return 'unavailable'
		}

		let loader
		let ad: RewardedAd
		try {
			loader = await sdk.RewardedAdLoader.create()
			ad = await loader.loadAd({ adUnitId: REWARDED_ID })
		} catch {
			return 'unavailable'
		}

		return await new Promise<RewardedShowResult>((resolve) => {
			let settled = false
			let rewarded = false
			const finish = (result: RewardedShowResult) => {
				if (settled) {
					return
				}
				settled = true
				resolve(result)
			}

			ad.onRewarded = () => {
				if (consumedRewardIds.has(attemptId)) {
					return
				}
				consumedRewardIds.add(attemptId)
				rewarded = true
				void Promise.resolve(options.onReward(attemptId)).catch(() => {
					// Wallet persistence failures are handled by caller.
				})
			}
			ad.onAdDismissed = () => {
				finish(rewarded ? 'rewarded' : 'closed_without_reward')
			}
			ad.onAdFailedToShow = () => finish('failed')
			void ad.show().catch(() => finish('failed'))
		})
	} catch {
		return 'failed'
	} finally {
		showBusy = false
	}
}

export function isRewardedShowBusy(): boolean {
	return showBusy
}

export function resetRewardedStateForTests(): void {
	showBusy = false
	consumedRewardIds.clear()
	rewardSeq = 0
}
