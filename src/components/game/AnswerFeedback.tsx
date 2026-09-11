import { Pressable, StyleSheet, Text, View } from 'react-native'
import { HINT_COSTS } from '../../economy'
import { MIN_TOUCH_TARGET } from '../../constants/gameplay'
import { theme } from '../../theme'

interface AnswerFeedbackProps {
	correct: boolean
	title: string
	detailLine: string
	explanation: string
	awaitingSecondAttempt?: boolean
	saveStreakAvailable?: boolean
	saveStreakUsed?: boolean
	streakBeforeWrong?: number
	canAffordSaveStreak?: boolean
	onSaveStreak?: () => void
}

/**
 * Inline feedback panel shown after an answer (not a modal).
 */
export function AnswerFeedback({
	correct,
	title,
	detailLine,
	explanation,
	awaitingSecondAttempt = false,
	saveStreakAvailable = false,
	saveStreakUsed = false,
	streakBeforeWrong = 0,
	canAffordSaveStreak = false,
	onSaveStreak,
}: AnswerFeedbackProps) {
	if (awaitingSecondAttempt) {
		return (
			<View style={[styles.panel, styles.panelRetry]}>
				<Text style={styles.title}>Попробуй ещё раз</Text>
				<Text style={styles.detail}>
					Неверный вариант заблокирован. Серия сохранена.
				</Text>
			</View>
		)
	}

	return (
		<View
			style={[
				styles.panel,
				correct || saveStreakUsed
					? styles.panelCorrect
					: styles.panelWrong,
			]}
		>
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.detail}>{detailLine}</Text>
			{explanation.trim().length > 0 ? (
				<Text style={styles.hint}>{explanation}</Text>
			) : null}

			{saveStreakAvailable && !saveStreakUsed ? (
				<View style={styles.saveBlock}>
					<Text style={styles.saveLabel}>
						Серия: {streakBeforeWrong}
					</Text>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Сохранить серию, стоимость ${HINT_COSTS.saveStreak} атомов`}
						accessibilityState={{ disabled: !canAffordSaveStreak }}
						disabled={!canAffordSaveStreak}
						onPress={onSaveStreak}
						style={[
							styles.saveButton,
							!canAffordSaveStreak ? styles.saveDisabled : null,
						]}
					>
						<Text style={styles.saveButtonText}>
							Сохранить серию · {HINT_COSTS.saveStreak} ⚛
						</Text>
					</Pressable>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	panel: {
		borderRadius: theme.radius.md,
		padding: theme.spacing.md,
		borderWidth: 1,
	},
	panelCorrect: {
		backgroundColor: theme.colors.successSoft,
		borderColor: theme.colors.success,
	},
	panelWrong: {
		backgroundColor: theme.colors.dangerSoft,
		borderColor: theme.colors.danger,
	},
	panelRetry: {
		backgroundColor: theme.colors.accentSoft,
		borderColor: theme.colors.accent,
	},
	title: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
		marginBottom: theme.spacing.xxs,
	},
	detail: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		fontWeight: '600',
	},
	hint: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.xs,
	},
	saveBlock: {
		marginTop: theme.spacing.md,
		gap: theme.spacing.xs,
	},
	saveLabel: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		fontWeight: '600',
	},
	saveButton: {
		minHeight: MIN_TOUCH_TARGET,
		borderRadius: theme.radius.md,
		backgroundColor: theme.colors.brand,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.md,
	},
	saveDisabled: {
		opacity: 0.45,
	},
	saveButtonText: {
		...theme.typography.button,
		color: theme.colors.textInverse,
	},
})
