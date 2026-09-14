/**
 * Injectable AppMetrica adapter boundary.
 * UI/domain call analytics facade only — never the native SDK directly.
 */

import { APPMETRICA_ENABLE_IN_DEV } from './config'

export type AnalyticsAdapter = {
	activate: (apiKey: string) => void
	reportEvent: (
		name: string,
		attributes?: Record<string, string | number | boolean>,
	) => void
}

type AppMetricaModule = {
	activate: (config: Record<string, unknown>) => void
	reportEvent: (
		name: string,
		attributes?: Record<string, string | number | boolean>,
	) => void
}

function loadNativeAppMetrica(): AppMetricaModule | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('@appmetrica/react-native-analytics') as
			| AppMetricaModule
			| { default: AppMetricaModule }
		if (mod && typeof (mod as AppMetricaModule).activate === 'function') {
			return mod as AppMetricaModule
		}
		if (
			mod &&
			'default' in mod &&
			typeof mod.default.activate === 'function'
		) {
			return mod.default
		}
		return null
	} catch {
		return null
	}
}

function shouldCallNative(): boolean {
	if (typeof __DEV__ !== 'undefined' && __DEV__ && !APPMETRICA_ENABLE_IN_DEV) {
		return false
	}
	return true
}

/**
 * Production adapter — lazy-requires native AppMetrica and never throws.
 */
export const nativeAppMetricaAdapter: AnalyticsAdapter = {
	activate(apiKey: string): void {
		if (!shouldCallNative()) {
			return
		}
		const AppMetrica = loadNativeAppMetrica()
		if (!AppMetrica) {
			return
		}
		AppMetrica.activate({
			apiKey,
			sessionTimeout: 300,
			logs: false,
			locationTracking: false,
			advIdentifiersTracking: false,
			crashReporting: true,
			sessionsAutoTracking: true,
			// Product `app_open` is tracked explicitly once via facade.
			appOpenTrackingEnabled: false,
			statisticsSending: true,
		})
	},
	reportEvent(name, attributes): void {
		if (!shouldCallNative()) {
			return
		}
		const AppMetrica = loadNativeAppMetrica()
		if (!AppMetrica) {
			return
		}
		if (attributes && Object.keys(attributes).length > 0) {
			AppMetrica.reportEvent(name, attributes)
		} else {
			AppMetrica.reportEvent(name)
		}
	},
}

let activeAdapter: AnalyticsAdapter = nativeAppMetricaAdapter

export function getAnalyticsAdapter(): AnalyticsAdapter {
	return activeAdapter
}

/** Tests inject a mock adapter; production uses native AppMetrica. */
export function setAnalyticsAdapterForTests(
	adapter: AnalyticsAdapter | null,
): void {
	activeAdapter = adapter ?? nativeAppMetricaAdapter
}

export function shouldUseNativeAppMetrica(): boolean {
	return shouldCallNative()
}
