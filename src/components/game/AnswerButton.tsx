import { Pressable, StyleSheet, Text } from 'react-native'
import { MIN_TOUCH_TARGET } from '../../constants/gameplay'
import { theme } from '../../theme'

export type AnswerButtonState =
	| 'idle'
	| 'correct'
	| 'wrong'
	| 'disabled'
	| 'hidden'

interface AnswerButtonProps {
	label: string
	state: AnswerButtonState
	onPress: () => void
}

/**
 * Large answer choice button with post-answer and 50/50 faded states.
 */
export function AnswerButton({ label, state, onPress }: AnswerButtonProps) {
	const locked = state !== 'idle'

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Ответ: ${label}`}
			accessibilityState={{ disabled: locked }}
			disabled={locked}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				state === 'correct' ? styles.correct : null,
				state === 'wrong' ? styles.wrong : null,
				state === 'disabled' ? styles.disabled : null,
				state === 'hidden' ? styles.hidden : null,
				pressed && state === 'idle' ? styles.pressed : null,
			]}
		>
			<Text
				style={[
					styles.label,
					state === 'correct' || state === 'wrong'
						? styles.labelInverse
						: null,
					state === 'hidden' ? styles.labelHidden : null,
				]}
			>
				{label}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
		minHeight: MIN_TOUCH_TARGET,
		borderRadius: theme.radius.md,
		borderWidth: 1.5,
		borderColor: theme.colors.border,
		backgroundColor: theme.colors.surface,
		paddingVertical: theme.spacing.sm + 4,
		paddingHorizontal: theme.spacing.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pressed: {
		backgroundColor: theme.colors.surfaceMuted,
	},
	correct: {
		backgroundColor: theme.colors.success,
		borderColor: theme.colors.success,
	},
	wrong: {
		backgroundColor: theme.colors.danger,
		borderColor: theme.colors.danger,
	},
	disabled: {
		opacity: 0.55,
	},
	hidden: {
		opacity: 0.28,
		backgroundColor: theme.colors.surfaceMuted,
	},
	label: {
		...theme.typography.button,
		color: theme.colors.textPrimary,
		textAlign: 'center',
	},
	labelInverse: {
		color: theme.colors.textInverse,
	},
	labelHidden: {
		color: theme.colors.textSecondary,
	},
})
