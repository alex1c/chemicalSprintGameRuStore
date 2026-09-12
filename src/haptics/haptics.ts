/**
 * Fail-safe haptic feedback helpers for gameplay and celebration events.
 * Never throw into gameplay flow — native failures are swallowed.
 *
 * Callers should fire-and-forget (void triggerX()) so await is never required.
 */

import * as ExpoHaptics from 'expo-haptics'

export type HapticEvent =
	| 'correct'
	| 'wrong'
	| 'achievement'
	| 'dailyCompleted'
	| 'hintPurchase'

export interface HapticTriggerOptions {
	/** When false, the call is a no-op. Default true. */
	enabled?: boolean
}

type NativeHaptics = {
	notificationAsync: typeof ExpoHaptics.notificationAsync
	selectionAsync: typeof ExpoHaptics.selectionAsync
	impactAsync: typeof ExpoHaptics.impactAsync
}

/** Injectable native bridge for unit tests. */
let nativeBridge: NativeHaptics = ExpoHaptics

/**
 * Override the Expo Haptics bridge (tests only).
 */
export function setHapticsBridgeForTests(bridge: NativeHaptics | null): void {
	nativeBridge = bridge ?? ExpoHaptics
}

/**
 * Fire a semantic haptic event. Safe when disabled or when native APIs fail.
 */
export function triggerHaptic(
	event: HapticEvent,
	options: HapticTriggerOptions = {},
): void {
	const enabled = options.enabled !== false
	if (!enabled) {
		return
	}

	void runHaptic(event).catch(() => {
		// Native haptics unavailable or rejected — ignore.
	})
}

async function runHaptic(event: HapticEvent): Promise<void> {
	switch (event) {
		case 'correct':
			await nativeBridge.notificationAsync(
				ExpoHaptics.NotificationFeedbackType.Success,
			)
			return
		case 'wrong':
			await nativeBridge.notificationAsync(
				ExpoHaptics.NotificationFeedbackType.Warning,
			)
			return
		case 'achievement':
			await nativeBridge.notificationAsync(
				ExpoHaptics.NotificationFeedbackType.Success,
			)
			// Slightly more noticeable celebration: soft impact after success.
			await nativeBridge.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium)
			return
		case 'dailyCompleted':
			await nativeBridge.notificationAsync(
				ExpoHaptics.NotificationFeedbackType.Success,
			)
			return
		case 'hintPurchase':
			await nativeBridge.selectionAsync()
			return
		default: {
			const _exhaustive: never = event
			return _exhaustive
		}
	}
}

/** Convenience wrappers keep call sites readable. */
export function hapticCorrect(enabled?: boolean): void {
	triggerHaptic('correct', { enabled })
}

export function hapticWrong(enabled?: boolean): void {
	triggerHaptic('wrong', { enabled })
}

export function hapticAchievement(enabled?: boolean): void {
	triggerHaptic('achievement', { enabled })
}

export function hapticDailyCompleted(enabled?: boolean): void {
	triggerHaptic('dailyCompleted', { enabled })
}

export function hapticHintPurchase(enabled?: boolean): void {
	triggerHaptic('hintPurchase', { enabled })
}
