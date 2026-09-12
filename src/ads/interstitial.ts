/**
 * Interstitial load/show bridge. Failures never block navigation.
 */

import { INTERSTITIAL_ID, INTERSTITIAL_POLICY } from './config'
import { getAdsSdk, initializeAdsSdk } from './sdk'
import type { InterstitialShowResult } from './types'

type InterstitialAd = import('yandex-mobile-ads').InterstitialAd

let cachedAd: InterstitialAd | null = null
let loadInFlight: Promise<void> | null = null

async function loadInterstitialAd(): Promise<void> {
	if (cachedAd) {
		return
	}
	if (loadInFlight) {
		await loadInFlight
		return
	}
	loadInFlight = (async () => {
		const ok = await initializeAdsSdk()
		const sdk = getAdsSdk()
		if (!ok || !sdk) {
			return
		}
		try {
			const loader = await sdk.InterstitialAdLoader.create()
			const ad = await loader.loadAd({ adUnitId: INTERSTITIAL_ID })
			cachedAd = ad
		} catch {
			cachedAd = null
		} finally {
			loadInFlight = null
		}
	})()
	await loadInFlight
}

function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	fallback: T,
): Promise<T> {
	return new Promise((resolve) => {
		let settled = false
		const timer = setTimeout(() => {
			if (!settled) {
				settled = true
				resolve(fallback)
			}
		}, timeoutMs)
		promise
			.then((value) => {
				if (!settled) {
					settled = true
					clearTimeout(timer)
					resolve(value)
				}
			})
			.catch(() => {
				if (!settled) {
					settled = true
					clearTimeout(timer)
					resolve(fallback)
				}
			})
	})
}

async function showLoadedAd(
	ad: InterstitialAd,
	timeoutMs: number,
): Promise<InterstitialShowResult> {
	return new Promise((resolve) => {
		let settled = false
		let didShow = false
		const finish = (result: InterstitialShowResult) => {
			if (settled) {
				return
			}
			settled = true
			clearTimeout(startTimer)
			resolve(result)
		}
		const startTimer = setTimeout(() => {
			if (!didShow) {
				finish('failed')
			}
		}, timeoutMs)
		ad.onAdShown = () => {
			didShow = true
			clearTimeout(startTimer)
		}
		ad.onAdDismissed = () => finish(didShow ? 'shown' : 'failed')
		ad.onAdFailedToShow = () => finish('failed')
		void ad.show().catch(() => finish('failed'))
	})
}

export async function preloadInterstitial(): Promise<void> {
	try {
		await loadInterstitialAd()
	} catch {
		// Preload must never affect UI.
	}
}

/**
 * Attempt to show interstitial. Resolves quickly on failure.
 */
export async function showInterstitialWithTimeout(
	timeoutMs: number = INTERSTITIAL_POLICY.showTimeoutMs,
): Promise<InterstitialShowResult> {
	try {
		if (!cachedAd) {
			await withTimeout(
				loadInterstitialAd(),
				Math.min(timeoutMs, 2000),
				undefined,
			)
		}
		const ad = cachedAd
		cachedAd = null
		if (!ad) {
			return 'failed'
		}
		const result = await showLoadedAd(ad, timeoutMs)
		void preloadInterstitial()
		return result
	} catch {
		return 'failed'
	}
}

export function resetInterstitialCacheForTests(): void {
	cachedAd = null
	loadInFlight = null
}
