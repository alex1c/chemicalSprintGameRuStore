/**
 * Lazy Yandex Mobile Ads SDK bridge.
 * Never hard-import the native module from screens — fail open when missing.
 */

import { Platform } from 'react-native'
import { ADS_INIT_DELAY_MS } from './config'

type YandexSdk = typeof import('yandex-mobile-ads')

let sdkModule: YandexSdk | null = null
let initStarted = false
let initDone = false
let initPromise: Promise<boolean> | null = null

function loadSdk(): YandexSdk | null {
	if (Platform.OS === 'web') {
		return null
	}
	if (sdkModule) {
		return sdkModule
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		sdkModule = require('yandex-mobile-ads') as YandexSdk
		return sdkModule
	} catch {
		sdkModule = null
		return null
	}
}

/**
 * Initialize Mobile Ads once. Safe to call repeatedly. Never throws.
 */
export async function initializeAdsSdk(): Promise<boolean> {
	if (initDone) {
		return true
	}
	if (initPromise) {
		return initPromise
	}
	initPromise = (async () => {
		if (initStarted && initDone) {
			return true
		}
		initStarted = true
		const sdk = loadSdk()
		if (!sdk) {
			initStarted = false
			return false
		}
		try {
			// General-audience educational game — not child-directed.
			sdk.MobileAds.setAgeRestrictedUser(false)
			sdk.MobileAds.setLocationConsent(false)
			await sdk.MobileAds.initialize()
			initDone = true
			return true
		} catch {
			initStarted = false
			initDone = false
			return false
		}
	})()
	try {
		return await initPromise
	} finally {
		if (!initDone) {
			initPromise = null
		}
	}
}

export function getAdsSdk(): YandexSdk | null {
	return loadSdk()
}

export function isAdsSdkInitialized(): boolean {
	return initDone
}

/**
 * Schedule non-blocking SDK boot after first paint.
 */
export function scheduleAdsBootstrap(
	onReady?: () => void,
	delayMs: number = ADS_INIT_DELAY_MS,
): () => void {
	let cancelled = false
	const timer = setTimeout(() => {
		void initializeAdsSdk().then((ok) => {
			if (!cancelled && ok) {
				onReady?.()
			}
		})
	}, delayMs)
	return () => {
		cancelled = true
		clearTimeout(timer)
	}
}

/** Jest helper. */
export function resetAdsSdkStateForTests(): void {
	sdkModule = null
	initStarted = false
	initDone = false
	initPromise = null
}
