/**
 * Typed analytics event taxonomy for Химический спринт.
 * Keep payloads free of personal data / free-form user text.
 */

export const AnalyticsEvents = {
	APP_OPEN: 'app_open',
	GAME_STARTED: 'game_started',
	GAME_COMPLETED: 'game_completed',
	MODE_SELECTED: 'mode_selected',
	ANSWER_CORRECT: 'answer_correct',
	ANSWER_WRONG: 'answer_wrong',
	HINT_USED: 'hint_used',
	ATOMS_EARNED: 'atoms_earned',
	ATOMS_SPENT: 'atoms_spent',
	DAILY_STARTED: 'daily_started',
	DAILY_COMPLETED: 'daily_completed',
	ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
	PROGRESS_OPENED: 'progress_opened',
	REWARDED_OFFER_OPENED: 'rewarded_offer_opened',
	REWARDED_COMPLETED: 'rewarded_completed',
	INTERSTITIAL_SHOWN: 'interstitial_shown',
} as const

export type AnalyticsEventName =
	(typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]

export type AnalyticsParams = Record<
	string,
	string | number | boolean | null | undefined
>

const ALLOWED_EVENTS = new Set<string>(Object.values(AnalyticsEvents))

export function isKnownAnalyticsEvent(name: string): name is AnalyticsEventName {
	return ALLOWED_EVENTS.has(name)
}

/**
 * Strip unsafe / oversized attributes before any future network send.
 */
export function sanitizeAnalyticsParams(
	params?: AnalyticsParams,
): Record<string, string | number | boolean> | undefined {
	if (!params) {
		return undefined
	}
	const result: Record<string, string | number | boolean> = {}
	for (const [key, value] of Object.entries(params)) {
		if (value == null) {
			continue
		}
		if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		) {
			// Avoid dumping free-form long text.
			if (typeof value === 'string' && value.length > 64) {
				result[key] = value.slice(0, 64)
			} else {
				result[key] = value
			}
		}
	}
	return Object.keys(result).length > 0 ? result : undefined
}
