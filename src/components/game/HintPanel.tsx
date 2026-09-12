import { useEffect, useRef } from 'react'
import {
	Animated,
	LayoutAnimation,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	UIManager,
	View,
} from 'react-native'
import { HINT_COSTS, HINT_LABELS_RU, type HintType } from '../../economy'
import { MIN_TOUCH_TARGET } from '../../constants/gameplay'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { theme } from '../../theme'

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface HintPanelProps {
	open: boolean
	onToggle: () => void
	disabled?: boolean
	atomBalance: number
	allowedHints: readonly HintType[]
	canAffordHint: (type: HintType) => boolean
	isHintAvailable: (type: HintType) => boolean
	onUseHint: (type: Exclude<HintType, 'saveStreak'>) => void
	insufficientMessage?: string | null
	secondChanceActive?: boolean
}

/**
 * Expandable hint controls with light open animation and clear used/disabled states.
 */
export function HintPanel({
	open,
	onToggle,
	disabled = false,
	atomBalance,
	allowedHints,
	canAffordHint,
	isHintAvailable,
	onUseHint,
	insufficientMessage,
	secondChanceActive = false,
}: HintPanelProps) {
	const reduceMotion = useReducedMotion()
	const panelOpacity = useRef(new Animated.Value(open ? 1 : 0)).current

	const preAnswerHints = (
		['fiftyFifty', 'fact', 'secondChance'] as const
	).filter((type) => allowedHints.includes(type))

	useEffect(() => {
		if (reduceMotion) {
			panelOpacity.setValue(open ? 1 : 0)
			return
		}
		Animated.timing(panelOpacity, {
			toValue: open ? 1 : 0,
			duration: theme.motion.hintPanel,
			useNativeDriver: true,
		}).start()
	}, [open, reduceMotion, panelOpacity])

	if (preAnswerHints.length === 0) {
		return null
	}

	const handleToggle = () => {
		if (!reduceMotion) {
			LayoutAnimation.configureNext(
				LayoutAnimation.create(
					theme.motion.hintPanel,
					LayoutAnimation.Types.easeInEaseOut,
					LayoutAnimation.Properties.opacity,
				),
			)
		}
		onToggle()
	}

	return (
		<View style={styles.wrap}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={open ? 'Скрыть подсказки' : 'Открыть подсказки'}
				disabled={disabled}
				onPress={handleToggle}
				style={({ pressed }) => [
					styles.toggle,
					disabled ? styles.disabled : null,
					pressed && !disabled ? styles.togglePressed : null,
				]}
			>
				<Text style={styles.toggleLabel}>
					💡 Подсказки {open ? '▴' : '▾'}
				</Text>
				<Text style={styles.balanceHint}>баланс {atomBalance} ⚛</Text>
			</Pressable>

			{secondChanceActive ? (
				<View style={styles.shield}>
					<Text style={styles.shieldText}>🛡 Вторая попытка активна</Text>
				</View>
			) : null}

			{open && !disabled ? (
				<Animated.View style={[styles.panel, { opacity: panelOpacity }]}>
					{preAnswerHints.map((type) => {
						const available = isHintAvailable(type)
						const affordable = canAffordHint(type)
						const enabled = available && affordable
						const cost = HINT_COSTS[type]
						const label = HINT_LABELS_RU[type]
						const used = !available
						return (
							<Pressable
								key={type}
								accessibilityRole="button"
								accessibilityLabel={`Подсказка ${label}, стоимость ${cost} атомов`}
								accessibilityState={{ disabled: !enabled }}
								disabled={!enabled}
								onPress={() => onUseHint(type)}
								style={({ pressed }) => [
									styles.hintButton,
									!enabled ? styles.hintDisabled : null,
									used ? styles.hintUsed : null,
									!affordable && available ? styles.hintUnaffordable : null,
									pressed && enabled ? styles.hintPressed : null,
								]}
							>
								<Text
									style={[
										styles.hintText,
										!enabled ? styles.hintTextDisabled : null,
									]}
								>
									{label}
									{used ? ' · использовано' : ` · ${cost} ⚛`}
								</Text>
							</Pressable>
						)
					})}
					{insufficientMessage ? (
						<>
							<Text style={styles.warn}>{insufficientMessage}</Text>
							<Text style={styles.rewardHint}>
								Можно получить +10 ⚛ за просмотр рекламы на главной
							</Text>
						</>
					) : null}
				</Animated.View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		gap: theme.spacing.xs,
	},
	toggle: {
		alignSelf: 'flex-start',
		minHeight: MIN_TOUCH_TARGET,
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xs,
		borderRadius: theme.radius.md,
		backgroundColor: theme.colors.surfaceMuted,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	togglePressed: {
		backgroundColor: theme.colors.surfaceElevated,
		borderColor: theme.colors.brandSoft,
	},
	toggleLabel: {
		...theme.typography.button,
		color: theme.colors.brand,
	},
	balanceHint: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: 2,
	},
	disabled: {
		opacity: 0.5,
	},
	shield: {
		alignSelf: 'flex-start',
		backgroundColor: theme.colors.infoSoft,
		borderRadius: theme.radius.sm,
		borderWidth: 1,
		borderColor: theme.colors.info,
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xxs,
	},
	shieldText: {
		...theme.typography.caption,
		color: theme.colors.brandSoft,
		fontWeight: '700',
	},
	panel: {
		backgroundColor: theme.colors.surfaceElevated,
		borderRadius: theme.radius.md,
		borderWidth: 1,
		borderColor: theme.colors.border,
		padding: theme.spacing.sm,
		gap: theme.spacing.xs,
	},
	hintButton: {
		minHeight: MIN_TOUCH_TARGET,
		borderRadius: theme.radius.sm,
		backgroundColor: theme.colors.surfaceMuted,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.md,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	hintPressed: {
		backgroundColor: theme.colors.brandSoft,
		borderColor: theme.colors.brand,
	},
	hintDisabled: {
		opacity: 0.55,
	},
	hintUsed: {
		backgroundColor: theme.colors.disabledSoft,
		borderColor: theme.colors.disabled,
	},
	hintUnaffordable: {
		borderColor: theme.colors.warning,
	},
	hintText: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		fontWeight: '600',
		textAlign: 'center',
	},
	hintTextDisabled: {
		color: theme.colors.textSecondary,
	},
	warn: {
		...theme.typography.caption,
		color: theme.colors.error,
		textAlign: 'center',
	},
	rewardHint: {
		...theme.typography.caption,
		color: theme.colors.brandSoft,
		textAlign: 'center',
		fontWeight: '600',
	},
})
