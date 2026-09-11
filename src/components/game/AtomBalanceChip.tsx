import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme'

interface AtomBalanceChipProps {
	balance: number
	compact?: boolean
}

/**
 * Compact atom balance display used on Home and Game screens.
 */
export function AtomBalanceChip({
	balance,
	compact = false,
}: AtomBalanceChipProps) {
	return (
		<View
			accessibilityRole="text"
			accessibilityLabel={`Баланс атомов: ${balance}`}
			style={[styles.chip, compact ? styles.compact : null]}
		>
			<Text style={styles.text}>⚛ {balance}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	chip: {
		backgroundColor: theme.colors.surface,
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
