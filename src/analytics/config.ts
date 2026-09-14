/**
 * Analytics configuration — production AppMetrica key lives here only.
 * Do not copy the API key into screens or repositories.
 */

/** Production AppMetrica API key (Yandex AppMetrica). */
export const APPMETRICA_API_KEY =
	'063533b3-e38c-4d3d-af67-848018520f6d'

/**
 * Hard gate: analytics is production-enabled with a real key.
 */
export const ANALYTICS_ENABLED = true

/** Provider label for diagnostics. */
export const ANALYTICS_PROVIDER = 'appmetrica' as const

/**
 * When false, AppMetrica activate/report are skipped in __DEV__
 * (tests inject a mock adapter instead).
 */
export const APPMETRICA_ENABLE_IN_DEV = false
