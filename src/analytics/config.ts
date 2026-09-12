/**
 * Analytics configuration boundary.
 * Production AppMetrica API key is NOT present yet — do not invent one.
 */

/** Empty until a real AppMetrica key is provided by the product owner. */
export const APPMETRICA_API_KEY: string | null = null

function hasUsableApiKey(key: string | null): boolean {
	return typeof key === 'string' && key.trim().length > 0
}

/**
 * Hard gate: analytics native activation stays off without a real key.
 */
export const ANALYTICS_ENABLED: boolean = hasUsableApiKey(APPMETRICA_API_KEY)

/** Provider label for diagnostics / future wiring. */
export const ANALYTICS_PROVIDER = 'appmetrica' as const

/** Never activate AppMetrica in __DEV__ until explicitly enabled with a real key. */
export const APPMETRICA_ENABLE_IN_DEV = false
