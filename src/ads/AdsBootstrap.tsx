/**
 * Boots Yandex Mobile Ads after first paint — never blocks startup UI.
 */

import { useEffect, type ReactNode } from 'react'
import { AppState, Platform } from 'react-native'
import { preloadInterstitial } from './interstitial'
import { scheduleAdsBootstrap } from './sdk'

interface AdsBootstrapProps {
	children: ReactNode
}

export function AdsBootstrap({ children }: AdsBootstrapProps) {
	useEffect(() => {
		if (Platform.OS === 'web') {
			return
		}

		const cancel = scheduleAdsBootstrap(() => {
			void preloadInterstitial()
		})

		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') {
				void preloadInterstitial()
			}
		})

		return () => {
			cancel()
			sub.remove()
		}
	}, [])

	return <>{children}</>
}
