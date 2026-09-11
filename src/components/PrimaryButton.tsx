import {
	Pressable,
	StyleSheet,
	Text,
	type GestureResponderEvent,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { theme } from '../theme'

interface PrimaryButtonProps {
	label: string
	onPress: (event: GestureResponderEvent) => void
	disabled?: boolean
	accessibilityLabel?: string
	variant?: 'primary' | 'secondary'
	style?: StyleProp<ViewStyle>
}

/**
 * Primary CTA with built-in vertical padding; parent Screen supplies bottom safe area.
 */
export function PrimaryButton({
	label,
	onPress,
	disabled = false,
	accessibilityLabel,
	variant = 'primary',
	style,
}: PrimaryButtonProps) {
	const isSecondary = variant === 'secondary'

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				isSecondary ? styles.secondary : styles.primary,
				pressed && !disabled
					? isSecondary
						? styles.secondaryPressed
						: styles.pressed
					: null,
				disabled ? styles.disabled : null,
				style,
			]}
		>
			<Text
				style={[
					styles.label,
					isSecondary ? styles.secondaryLabel : null,
				]}
			>
				{label}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
		borderRadius: theme.radius.md,
		paddingVertical: theme.spacing.sm + 2,
		paddingHorizontal: theme.spacing.lg,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: MIN_TOUCH_TARGET,
	},
	primary: {
		backgroundColor: theme.colors.brand,
	},
	secondary: {
		backgroundColor: theme.colors.surface,
		borderWidth: 1.5,
		borderColor: theme.colors.brand,
	},
	pressed: {
		backgroundColor: theme.colors.brandSoft,
	},
	secondaryPressed: {
		backgroundColor: theme.colors.surfaceMuted,
	},
	disabled: {
		opacity: 0.5,
	},
	label: {
		...theme.typography.button,
		color: theme.colors.textInverse,
	},
	secondaryLabel: {
		color: theme.colors.brand,
	},
})
