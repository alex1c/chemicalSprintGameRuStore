/**
 * Fail-safe analytics facade.
 * AppMetrica stays dormant until a real API key is configured.
 */

import {
	ANALYTICS_ENABLED,
	APPMETRICA_API_KEY,
	APPMETRICA_ENABLE_IN_DEV,
} from './config'
import {
	isKnownAnalyticsEvent,
	sanitizeAnalyticsParams,
	type AnalyticsEventName,
	type AnalyticsParams,
} from './events'

type AppMetricaModule = {
	activate: (config: {
		apiKey: string
		sessionTimeout?: number
		logs?: boolean
		statisticsSending?: boolean
	}) => void
	reportEvent: (name: string, attributes?: Record<string, unknown>) => void
}

let activated = false

function getAppMetrica(): AppMetricaModule | null {
	if (!ANALYTICS_ENABLED || !APPMETRICA_API_KEY) {
		return null
	}
	if (__DEV__ && !APPMETRICA_ENABLE_IN_DEV) {
		return null
	}
	try {
		// Lazy require — package may be absent until production key arrives.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('@appmetrica/react-native-analytics') as
			| AppMetricaModule
			| { default: AppMetricaModule }
		if (mod && typeof (mod as AppMetricaModule).activate === 'function') {
			return mod as AppMetricaModule
		}
		if (
			mod &&
			typeof (mod as { default: AppMetricaModule }).default?.activate ===
				'function'
		) {
			return (mod as { default: AppMetricaModule }).default
		}
		return null
	} catch {
		return null
	}
}

/**
 * Activate AppMetrica once when a real key exists. Safe no-op otherwise.
 */
export function activateAnalytics(): void {
	try {
		if (!ANALYTICS_ENABLED || !APPMETRICA_API_KEY || activated) {
			return
		}
		const AppMetrica = getAppMetrica()
		if (!AppMetrica) {
			return
		}
		AppMetrica.activate({
			apiKey: APPMETRICA_API_KEY,
			sessionTimeout: 300,
			logs: false,
			statisticsSending: true,
		})
		activated = true
	} catch {
		// Never block startup.
	}
}

/**
 * Track a typed product event. Never throws into gameplay.
 */
export function trackEvent(
	name: AnalyticsEventName | string,
	params?: AnalyticsParams,
): void {
	try {
		if (!isKnownAnalyticsEvent(name)) {
			return
		}
		const attributes = sanitizeAnalyticsParams(params)
		if (!ANALYTICS_ENABLED) {
			return
		}
		const AppMetrica = getAppMetrica()
		if (!AppMetrica || !activated) {
			return
		}
		if (attributes) {
			AppMetrica.reportEvent(name, attributes)
		} else {
			AppMetrica.reportEvent(name)
		}
	} catch {
		// Swallow — analytics must never break gameplay.
	}
}

export function isAnalyticsActivated(): boolean {
	return activated
}

/** Jest helper. */
export function resetAnalyticsForTests(): void {
	activated = false
}
