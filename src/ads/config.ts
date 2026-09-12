/**
 * Central production Yandex Advertising Network (РСЯ) configuration.
 * Do not scatter ad unit IDs across UI screens.
 */

/** Partner app UUID from Yandex Advertising Network console. */
export const YANDEX_ADS_APP_ID = '063533b3-e38c-4d3d-af67-848018520f6d'

export const HOME_BANNER_ID = 'R-M-20034045-1'
export const SECONDARY_BANNER_ID = 'R-M-20034045-2'
export const LEARNING_BANNER_ID = 'R-M-20034045-3'
export const INTERSTITIAL_ID = 'R-M-20034045-4'
export const REWARDED_ID = 'R-M-20034045-5'

export const AD_UNITS = {
	homeBanner: HOME_BANNER_ID,
	secondaryBanner: SECONDARY_BANNER_ID,
	learningBanner: LEARNING_BANNER_ID,
	interstitial: INTERSTITIAL_ID,
	rewarded: REWARDED_ID,
} as const

/** Atoms granted on confirmed rewarded completion. */
export const REWARDED_ATOM_GRANT = 10

/** Max confirmed rewarded completions per local calendar day. */
export const REWARDED_DAILY_MAX = 3

/**
 * Interstitial pacing (completed eligible games).
 * firstEligibleAfterGames = 3 means games 1–2 never trigger.
 */
export const INTERSTITIAL_POLICY = {
	firstEligibleAfterGames: 3,
	gamesBetweenInterstitial: 4,
	maxPerAppSession: 1,
	showTimeoutMs: 4000,
} as const

/** Deferred SDK boot so first paint is never blocked. */
export const ADS_INIT_DELAY_MS = 1500

export type BannerPlacement = 'home' | 'secondary' | 'learning'

/**
 * Map calm-screen placement → production banner unit.
 */
export function bannerUnitForPlacement(placement: BannerPlacement): string {
	switch (placement) {
		case 'home':
			return AD_UNITS.homeBanner
		case 'secondary':
			return AD_UNITS.secondaryBanner
		case 'learning':
			return AD_UNITS.learningBanner
		default: {
			const _exhaustive: never = placement
			return _exhaustive
		}
	}
}
