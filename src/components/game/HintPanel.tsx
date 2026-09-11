import { Pressable, StyleSheet, Text, View } from 'react-native'
import { HINT_COSTS, HINT_LABELS_RU, type HintType } from '../../economy'
import { MIN_TOUCH_TARGET } from '../../constants/gameplay'
import { theme } from '../../theme'

interface HintPanelProps {
	open: boolean
	onToggle: () => void
	disabled?: boolean
	atomBalance: number
	canAffordHint: (type: HintType) => boolean
	isHintAvailable: (type: HintType) => boolean
	onUseHint: (type: Exclude<HintType, 'saveStreak'>) => void
	insufficientMessage?: string | null
	secondChanceActive?: boolean
}

const PRE_ANSWER_HINTS: Exclude<HintType, 'saveStreak'>[] = [
	'fiftyFifty',
	'fact',
	'secondChance',
]

/**
 * Compact expandable hint controls for Classic Sprint.
 */
export function HintPanel({
	open,
	onToggle,
	disabled = false,
	canAffordHint,
	isHintAvailable,
	onUseHint,
	insufficientMessage,
	secondChanceActive = false,
}: HintPanelProps) {
	return (
		<View style={styles.wrap}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Открыть подсказки"
				disabled={disabled}
				onPress={onToggle}
				style={[styles.toggle, disabled ? styles.disabled : null]}
			>
				<Text style={styles.toggleLabel}>💡 Подсказки</Text>
			</Pressable>

			{secondChanceActive ? (
				<Text style={styles.shield}>🛡 Вторая попытка активна</Text>
			) : null}

			{open && !disabled ? (
				<View style={styles.panel}>
					{PRE_ANSWER_HINTS.map((type) => {
						const available = isHintAvailable(type)
						const affordable = canAffordHint(type)
						const enabled = available && affordable
						const cost = HINT_COSTS[type]
						const label = HINT_LABELS_RU[type]
						return (
							<Pressable
								key={type}
								accessibilityRole="button"
								accessibilityLabel={`Подсказка ${label}, стоимость ${cost} атомов`}
								accessibilityState={{ disabled: !enabled }}
								disabled={!enabled}
								onPress={() => onUseHint(type)}
								style={[
									styles.hintButton,
									!enabled ? styles.hintDisabled : null,
								]}
							>
								<Text style={styles.hintText}>
									{label} · {cost} ⚛
								</Text>
							</Pressable>
						)
					})}
					{insufficientMessage ? (
						<Text style={styles.warn}>{insufficientMessage}</Text>
					) : null}
				</View>
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
		borderRadius: theme.radius.md,
		backgroundColor: theme.colors.surfaceMuted,
	},
	toggleLabel: {
		...theme.typography.button,
		color: theme.colors.brand,
	},
	disabled: {
		opacity: 0.5,
	},
	shield: {
		...theme.typography.caption,
		color: theme.colors.brandSoft,
		fontWeight: '600',
	},
	panel: {
		backgroundColor: theme.colors.surface,
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
	},
	hintDisabled: {
		opacity: 0.45,
	},
	hintText: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		fontWeight: '600',
	},
	warn: {
		...theme.typography.caption,
		color: theme.colors.danger,
		textAlign: 'center',
	},
})
