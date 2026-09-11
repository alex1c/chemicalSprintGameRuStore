import {
	Pressable,
	StyleSheet,
	Text,
	type GestureResponderEvent,
} from 'react-native'
import { theme } from '../theme'

interface PrimaryButtonProps {
	label: string
	onPress: (event: GestureResponderEvent) => void
	disabled?: boolean
}

/**
 * Primary CTA with built-in vertical padding; parent Screen supplies bottom safe area.
 */
export function PrimaryButton({
	label,
	onPress,
	disabled = false,
}: PrimaryButtonProps) {
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				pressed && !disabled ? styles.pressed : null,
				disabled ? styles.disabled : null,
			]}
		>
			<Text style={styles.label}>{label}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
		backgroundColor: theme.colors.brand,
		borderRadius: theme.radius.md,
		paddingVertical: theme.spacing.sm + 2,
		paddingHorizontal: theme.spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 48,
	},
	pressed: {
		backgroundColor: theme.colors.brandSoft,
	},
	disabled: {
		opacity: 0.5,
	},
	label: {
		...theme.typography.button,
		color: theme.colors.textInverse,
	},
})
