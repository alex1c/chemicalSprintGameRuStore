import {
	ANALYTICS_ENABLED,
	APPMETRICA_API_KEY,
	activateAnalytics,
	isAnalyticsActivated,
	isKnownAnalyticsEvent,
	resetAnalyticsForTests,
	sanitizeAnalyticsParams,
	trackEvent,
} from '../../src/analytics'

describe('analytics foundation', () => {
	beforeEach(() => {
		resetAnalyticsForTests()
	})

	it('has no invented AppMetrica key and stays disabled', () => {
		expect(APPMETRICA_API_KEY).toBeNull()
		expect(ANALYTICS_ENABLED).toBe(false)
		activateAnalytics()
		expect(isAnalyticsActivated()).toBe(false)
	})

	it('never throws from trackEvent when disabled', () => {
		expect(() => trackEvent('app_open')).not.toThrow()
		expect(() =>
			trackEvent('game_completed', { mode: 'CLASSIC', score: 10 }),
		).not.toThrow()
	})

	it('rejects unknown event names', () => {
		expect(isKnownAnalyticsEvent('app_open')).toBe(true)
		expect(isKnownAnalyticsEvent('not_a_real_event')).toBe(false)
	})

	it('sanitizes params', () => {
		const cleaned = sanitizeAnalyticsParams({
			mode: 'CLASSIC',
			empty: null,
			long: 'x'.repeat(80),
			ok: 1,
		})
		expect(cleaned?.mode).toBe('CLASSIC')
		expect(cleaned?.ok).toBe(1)
		expect(String(cleaned?.long).length).toBe(64)
		expect(cleaned?.empty).toBeUndefined()
	})
})
