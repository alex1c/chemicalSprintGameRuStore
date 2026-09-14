import {
	ANALYTICS_ENABLED,
	APPMETRICA_API_KEY,
	activateAnalytics,
	hasReportedAppOpenThisSession,
	isAnalyticsActivated,
	isKnownAnalyticsEvent,
	resetAnalyticsForTests,
	sanitizeAnalyticsParams,
	setAnalyticsAdapterForTests,
	trackEvent,
	type AnalyticsAdapter,
} from '../../src/analytics'

describe('analytics foundation', () => {
	const activate = jest.fn()
	const reportEvent = jest.fn()

	beforeEach(() => {
		resetAnalyticsForTests()
		activate.mockReset()
		reportEvent.mockReset()
		const adapter: AnalyticsAdapter = {
			activate: (key) => activate(key),
			reportEvent: (name, attrs) => reportEvent(name, attrs),
		}
		setAnalyticsAdapterForTests(adapter)
	})

	afterEach(() => {
		setAnalyticsAdapterForTests(null)
	})

	it('uses production AppMetrica config and is enabled', () => {
		expect(APPMETRICA_API_KEY).toBe(
			'063533b3-e38c-4d3d-af67-848018520f6d',
		)
		expect(ANALYTICS_ENABLED).toBe(true)
	})

	it('initializes once', () => {
		activateAnalytics()
		activateAnalytics()
		expect(activate).toHaveBeenCalledTimes(1)
		expect(activate).toHaveBeenCalledWith(APPMETRICA_API_KEY)
		expect(isAnalyticsActivated()).toBe(true)
	})

	it('reports app_open only once per session', () => {
		trackEvent('app_open')
		trackEvent('app_open')
		expect(reportEvent).toHaveBeenCalledTimes(1)
		expect(hasReportedAppOpenThisSession()).toBe(true)
	})

	it('report event invokes adapter', () => {
		trackEvent('game_started', { mode: 'CLASSIC' })
		expect(reportEvent).toHaveBeenCalledWith('game_started', {
			mode: 'CLASSIC',
		})
	})

	it('swallows adapter failures', () => {
		setAnalyticsAdapterForTests({
			activate: () => {
				throw new Error('activate boom')
			},
			reportEvent: () => {
				throw new Error('report boom')
			},
		})
		expect(() => activateAnalytics()).not.toThrow()
		resetAnalyticsForTests()
		setAnalyticsAdapterForTests({
			activate: () => undefined,
			reportEvent: () => {
				throw new Error('report boom')
			},
		})
		activateAnalytics()
		expect(() => trackEvent('progress_opened')).not.toThrow()
	})

	it('offline/native failure is safe for gameplay path', () => {
		setAnalyticsAdapterForTests({
			activate: () => undefined,
			reportEvent: () => {
				throw new Error('network down')
			},
		})
		activateAnalytics()
		expect(() =>
			trackEvent('game_completed', { mode: 'CLASSIC', score: 12 }),
		).not.toThrow()
	})

	it('rejects unknown event names', () => {
		expect(isKnownAnalyticsEvent('app_open')).toBe(true)
		expect(isKnownAnalyticsEvent('not_a_real_event')).toBe(false)
		trackEvent('not_a_real_event')
		expect(reportEvent).not.toHaveBeenCalled()
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
