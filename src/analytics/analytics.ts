/**
 * Fail-safe analytics facade backed by AppMetrica.
 * Never blocks gameplay / first render.
 */

import { ANALYTICS_ENABLED, APPMETRICA_API_KEY } from './config'
import { getAnalyticsAdapter } from './appMetricaAdapter'
import {
	AnalyticsEvents,
	isKnownAnalyticsEvent,
	sanitizeAnalyticsParams,
	type AnalyticsEventName,
	type AnalyticsParams,
} from './events'

let activated = false
let appOpenSent = false

/**
 * Activate AppMetrica once per process. Safe to call repeatedly.
 */
export function activateAnalytics(): void {
	try {
		if (!ANALYTICS_ENABLED || !APPMETRICA_API_KEY || activated) {
			return
		}
		getAnalyticsAdapter().activate(APPMETRICA_API_KEY)
		activated = true
	} catch {
		// Never block startup.
	}
}

/**
 * Track a typed product event. Never throws into gameplay.
 * `app_open` is emitted at most once per process/app session.
 */
export function trackEvent(
	name: AnalyticsEventName | string,
	params?: AnalyticsParams,
): void {
	try {
		if (!isKnownAnalyticsEvent(name)) {
			return
		}
		if (!ANALYTICS_ENABLED) {
			return
		}

		if (name === AnalyticsEvents.APP_OPEN) {
			if (appOpenSent) {
				return
			}
			appOpenSent = true
		}

		if (!activated) {
			activateAnalytics()
		}
		if (!activated) {
			return
		}

		const attributes = sanitizeAnalyticsParams(params)
		getAnalyticsAdapter().reportEvent(name, attributes)
	} catch {
		// Swallow — analytics must never break gameplay.
	}
}

export function isAnalyticsActivated(): boolean {
	return activated
}

export function hasReportedAppOpenThisSession(): boolean {
	return appOpenSent
}

/** Jest helper. */
export function resetAnalyticsForTests(): void {
	activated = false
	appOpenSent = false
}
