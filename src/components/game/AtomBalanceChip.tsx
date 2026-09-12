import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme'

interface AtomBalanceChipProps {
	/** When null/undefined, show a neutral placeholder instead of flashing 0. */
	balance: number | null | undefined
	compact?: boolean
	ready?: boolean
}

/**
 * Compact atom balance display used on Home and Game screens.
 */
export function AtomBalanceChip({
	balance,
	compact = false,
	ready = true,
}: AtomBalanceChipProps) {
	const showValue = ready && typeof balance === 'number'
	const label = showValue ? String(balance) : '—'

	return (
		<View
			accessibilityRole="text"
			accessibilityLabel={
				showValue ? `Баланс атомов: ${balance}` : 'Баланс атомов загружается'
			}
			style={[styles.chip, compact ? styles.compact : null]}
		>
			<Text style={styles.text}>⚛ {label}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	chip: {
		backgroundColor: theme.colors.surfaceElevated,
		borderRadius: theme.radius.pill,
		borderWidth: 1,
		borderColor: theme.colors.border,
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.xs,
		alignSelf: 'flex-start',
	},
	compact: {
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: 4,
	},
	text: {
		...theme.typography.subtitle,
		fontSize: 15,
		color: theme.colors.brand,
	},
})
