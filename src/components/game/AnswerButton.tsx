import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text } from 'react-native'
import { MIN_TOUCH_TARGET } from '../../constants/gameplay'
import { useReducedMotion } from '../../hooks/useReducedMotion'
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
 * Large answer choice with light scale pulse (correct) or horizontal shake (wrong).
 * Reduced motion keeps color/border feedback only.
 */
export function AnswerButton({ label, state, onPress }: AnswerButtonProps) {
	const locked = state !== 'idle'
	const reduceMotion = useReducedMotion()
	const scale = useRef(new Animated.Value(1)).current
	const translateX = useRef(new Animated.Value(0)).current

	useEffect(() => {
		scale.stopAnimation()
		translateX.stopAnimation()
		scale.setValue(1)
		translateX.setValue(0)

		if (reduceMotion) {
			return
		}

		if (state === 'correct') {
			Animated.sequence([
				Animated.timing(scale, {
					toValue: 1.04,
					duration: theme.motion.answerPulseOut,
					useNativeDriver: true,
				}),
				Animated.timing(scale, {
					toValue: 1,
					duration: theme.motion.answerPulseIn,
					useNativeDriver: true,
				}),
			]).start()
			return
		}

		if (state === 'wrong') {
			const half = theme.motion.shakeDuration / 4
			Animated.sequence([
				Animated.timing(translateX, {
					toValue: -6,
					duration: half,
					useNativeDriver: true,
				}),
				Animated.timing(translateX, {
					toValue: 6,
					duration: half,
					useNativeDriver: true,
				}),
				Animated.timing(translateX, {
					toValue: -3,
					duration: half,
					useNativeDriver: true,
				}),
				Animated.timing(translateX, {
					toValue: 0,
					duration: half,
					useNativeDriver: true,
				}),
			]).start()
		}
	}, [state, reduceMotion, scale, translateX])

	return (
		<Animated.View
			style={{ transform: [{ scale }, { translateX }] }}
		>
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
						state === 'disabled' ? styles.labelDisabled : null,
					]}
					numberOfLines={3}
				>
					{label}
				</Text>
			</Pressable>
		</Animated.View>
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
		borderColor: theme.colors.brandSoft,
	},
	correct: {
		backgroundColor: theme.colors.success,
		borderColor: theme.colors.success,
		// Subtle glow via soft border emphasis (no shadow bloat).
		borderWidth: 2,
	},
	wrong: {
		backgroundColor: theme.colors.error,
		borderColor: theme.colors.error,
		borderWidth: 2,
	},
	disabled: {
		opacity: 0.55,
		backgroundColor: theme.colors.disabledSoft,
	},
	hidden: {
		opacity: 0.32,
		backgroundColor: theme.colors.disabledSoft,
		borderColor: theme.colors.disabled,
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
		color: theme.colors.disabled,
		textDecorationLine: 'line-through',
	},
	labelDisabled: {
		color: theme.colors.textSecondary,
	},
})
