/**
 * Calm-screen banner — collapses on load failure (no empty hole).
 * Never use on Game / Result / Onboarding.
 */

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
	Dimensions,
	Platform,
	StyleSheet,
	View,
	type LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../theme'
import {
	bannerUnitForPlacement,
	type BannerPlacement,
} from './config'
import { getAdsSdk, initializeAdsSdk, isAdsSdkInitialized } from './sdk'

interface BannerAdProps {
	placement: BannerPlacement
}

type BannerSize = {
	width: number
	height: number
}

type BannerViewComponent = ComponentType<{
	size: BannerSize
	adRequest: { adUnitId: string }
	onAdLoaded?: () => void
	onAdFailedToLoad?: () => void
	style?: object
}>

function resolveBannerApi(): {
	BannerView: BannerViewComponent
	stickySize: (width: number) => Promise<BannerSize>
} | null {
	if (Platform.OS === 'web') {
		return null
	}
	const sdk = getAdsSdk()
	if (!sdk) {
		return null
	}
	return {
		BannerView: sdk.BannerView as BannerViewComponent,
		stickySize: (width) => sdk.BannerAdSize.stickySize(width),
	}
}

/**
 * In-layout banner slot. Hidden until loaded; null when unavailable.
 */
export function BannerAd({ placement }: BannerAdProps) {
	const insets = useSafeAreaInsets()
	const adUnitId = useMemo(
		() => bannerUnitForPlacement(placement),
		[placement],
	)
	const [sdkReady, setSdkReady] = useState(isAdsSdkInitialized())
	const api = useMemo(
		() => (sdkReady ? resolveBannerApi() : null),
		[sdkReady],
	)
	const [width, setWidth] = useState(
		() => Math.max(0, Dimensions.get('window').width - theme.spacing.md * 2),
	)
	const [size, setSize] = useState<BannerSize | null>(null)
	const [visible, setVisible] = useState(true)
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		let cancelled = false
		if (sdkReady) {
			return
		}
		void initializeAdsSdk().then((ok) => {
			if (!cancelled && ok) {
				setSdkReady(true)
			}
		})
		return () => {
			cancelled = true
		}
	}, [sdkReady])

	useEffect(() => {
		let cancelled = false
		if (!api || width <= 0) {
			return
		}
		void (async () => {
			try {
				const next = await api.stickySize(Math.floor(width))
				if (!cancelled) {
					setSize(next)
				}
			} catch {
				if (!cancelled) {
					setVisible(false)
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [api, width])

	const onLayout = (event: LayoutChangeEvent): void => {
		const next = Math.floor(event.nativeEvent.layout.width)
		if (next > 0 && Math.abs(next - width) > 1) {
			setWidth(next)
		}
	}

	if (!visible || !api) {
		return null
	}

	const BannerView = api.BannerView
	const reservedHeight = loaded ? size?.height ?? 0 : 0

	return (
		<View
			style={[
				styles.wrap,
				{
					minHeight: reservedHeight,
					paddingBottom: Math.min(insets.bottom, 8),
				},
			]}
			onLayout={onLayout}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			{size ? (
				<BannerView
					size={size}
					adRequest={{ adUnitId }}
					style={styles.banner}
					onAdLoaded={() => setLoaded(true)}
					onAdFailedToLoad={() => {
						setVisible(false)
						setLoaded(false)
					}}
				/>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: theme.spacing.sm,
		overflow: 'hidden',
	},
	banner: {
		alignSelf: 'center',
	},
})
