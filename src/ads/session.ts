/**
 * Process-scoped interstitial session flag (never persisted).
 */

let interstitialShownThisSession = false

export function hasInterstitialBeenShownThisSession(): boolean {
	return interstitialShownThisSession
}

export function markInterstitialShownThisSession(): void {
	interstitialShownThisSession = true
}

/** Jest helper — never call from production UI. */
export function resetInterstitialSessionForTests(): void {
	interstitialShownThisSession = false
}
