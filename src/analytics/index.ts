export {
	APPMETRICA_API_KEY,
	ANALYTICS_ENABLED,
	ANALYTICS_PROVIDER,
	APPMETRICA_ENABLE_IN_DEV,
} from './config'

export {
	AnalyticsEvents,
	isKnownAnalyticsEvent,
	sanitizeAnalyticsParams,
} from './events'

export type { AnalyticsEventName, AnalyticsParams } from './events'

export {
	activateAnalytics,
	trackEvent,
	isAnalyticsActivated,
	resetAnalyticsForTests,
} from './analytics'
