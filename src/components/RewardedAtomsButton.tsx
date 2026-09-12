import { useCallback, useEffect, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import {
	REWARDED_ATOM_GRANT,
	REWARDED_DAILY_MAX,
	canWatchRewarded,
	getRewardedRemainingToday,
	resolveRewardedDayState,
	showRewardedAd,
	type AdsPersistedState,
	type RewardedCtaState,
} from '../ads'
import { trackEvent } from '../analytics'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { getLocalDateKey } from '../daily'
import { hapticCorrect } from '../haptics'
import { useHapticsEnabled } from '../hooks/useHapticsEnabled'
import {
	grantRewardedAtoms,
	loadAdsState,
} from '../stats'
import { theme } from '../theme'

interface RewardedAtomsButtonProps {
	onGranted?: (payload: {
		atomsGranted: number
		atomBalance: number
	}) => void
	compact?: boolean
}

/**
 * Compact user-initiated rewarded CTA. Never auto-plays ads.
 */
export function RewardedAtomsButton({
	onGranted,
	compact = false,
}: RewardedAtomsButtonProps) {
	const hapticsEnabled = useHapticsEnabled()
	const busyRef = useRef(false)
	const [ads, setAds] = useState<AdsPersistedState | null>(null)
	const [ctaState, setCtaState] = useState<RewardedCtaState>('loading')
	const [flash, setFlash] = useState<string | null>(null)

	const refresh = useCallback(async () => {
		const next = await loadAdsState()
		const todayKey = getLocalDateKey()
		const day = resolveRewardedDayState(next, todayKey)
		setAds(day)
		const remaining = getRewardedRemainingToday({
			dateKey: todayKey,
			rewardedDateKey: day.rewardedDateKey,
			rewardedCompletedToday: day.rewardedCompletedToday,
			dailyMax: REWARDED_DAILY_MAX,
		})
		if (remaining <= 0) {
			setCtaState('limit_reached')
		} else {
			setCtaState('ready')
		}
	}, [])

	useEffect(() => {
		void refresh()
	}, [refresh])

	const handlePress = async () => {
		if (busyRef.current || ctaState === 'limit_reached' || ctaState === 'busy') {
			return
		}
		busyRef.current = true
		setCtaState('busy')
		trackEvent('rewarded_offer_opened')

		const todayKey = getLocalDateKey()
		const current = ads ?? (await loadAdsState())
		const day = resolveRewardedDayState(current, todayKey)
		if (
			!canWatchRewarded({
				dateKey: todayKey,
				rewardedDateKey: day.rewardedDateKey,
				rewardedCompletedToday: day.rewardedCompletedToday,
				dailyMax: REWARDED_DAILY_MAX,
			})
		) {
			setAds(day)
			setCtaState('limit_reached')
			busyRef.current = false
			return
		}

		const result = await showRewardedAd({
			onReward: async (rewardId) => {
				const grant = await grantRewardedAtoms(rewardId)
				if (grant.granted) {
					trackEvent('rewarded_completed', {
						amount: grant.atomsGranted,
					})
					hapticCorrect(hapticsEnabled)
					setFlash(`+${grant.atomsGranted} ⚛ · баланс ${grant.atomBalance}`)
					onGranted?.({
						atomsGranted: grant.atomsGranted,
						atomBalance: grant.atomBalance,
					})
					setAds(grant.ads)
				}
			},
		})

		busyRef.current = false
		if (result === 'unavailable' || result === 'failed') {
			setCtaState('unavailable')
			setTimeout(() => {
				void refresh()
			}, 2500)
		} else {
			await refresh()
		}
	}

	const todayKey = getLocalDateKey()
	const completed =
		ads && ads.rewardedDateKey === todayKey ? ads.rewardedCompletedToday : 0
	const label =
		ctaState === 'limit_reached'
			? `Сегодня ${completed} / ${REWARDED_DAILY_MAX}`
			: ctaState === 'busy' || ctaState === 'loading'
				? 'Загрузка…'
				: ctaState === 'unavailable'
					? 'Реклама недоступна'
					: `+${REWARDED_ATOM_GRANT} ⚛ за рекламу`

	return (
		<View style={styles.wrap}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{
					disabled:
						ctaState === 'limit_reached' ||
						ctaState === 'busy' ||
						ctaState === 'loading',
				}}
				disabled={
					ctaState === 'limit_reached' ||
					ctaState === 'busy' ||
					ctaState === 'loading'
				}
				onPress={() => {
					void handlePress()
				}}
				style={({ pressed }) => [
					styles.button,
					compact ? styles.compact : null,
					ctaState === 'limit_reached' ? styles.disabled : null,
					pressed && ctaState === 'ready' ? styles.pressed : null,
				]}
			>
				{ctaState === 'busy' || ctaState === 'loading' ? (
					<ActivityIndicator color={theme.colors.brand} />
				) : (
					<Text style={styles.label}>{label}</Text>
				)}
			</Pressable>
			{flash ? <Text style={styles.flash}>{flash}</Text> : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		alignItems: 'flex-start',
		gap: theme.spacing.xxs,
	},
	button: {
		minHeight: MIN_TOUCH_TARGET,
		borderRadius: theme.radius.md,
		borderWidth: 1,
		borderColor: theme.colors.brandSoft,
		backgroundColor: theme.colors.surfaceElevated,
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.xs,
		justifyContent: 'center',
	},
	compact: {
		paddingHorizontal: theme.spacing.sm,
	},
	pressed: {
		backgroundColor: theme.colors.surfaceMuted,
	},
	disabled: {
		opacity: 0.7,
		borderColor: theme.colors.border,
	},
	label: {
		...theme.typography.caption,
		color: theme.colors.brand,
		fontWeight: '700',
	},
	flash: {
		...theme.typography.caption,
		color: theme.colors.success,
		fontWeight: '700',
	},
})
