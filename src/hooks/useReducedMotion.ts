import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Respects the system "reduce motion" accessibility setting.
 * Falls back to false when the API is unavailable.
 */
export function useReducedMotion(): boolean {
	const [reduceMotion, setReduceMotion] = useState(false)

	useEffect(() => {
		let mounted = true

		void AccessibilityInfo.isReduceMotionEnabled()
			.then((enabled) => {
				if (mounted) {
					setReduceMotion(enabled)
				}
			})
			.catch(() => {
				// API unavailable — keep animations enabled.
			})

		const subscription = AccessibilityInfo.addEventListener(
			'reduceMotionChanged',
			(enabled) => {
				setReduceMotion(enabled)
			},
		)

		return () => {
			mounted = false
			subscription.remove()
		}
	}, [])

	return reduceMotion
}
