import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme'

interface AnswerFeedbackProps {
	correct: boolean
	title: string
	detailLine: string
	explanation: string
}

/**
 * Inline feedback panel shown after an answer (not a modal).
 */
export function AnswerFeedback({
	correct,
	title,
	detailLine,
	explanation,
}: AnswerFeedbackProps) {
	return (
		<View
			style={[
				styles.panel,
				correct ? styles.panelCorrect : styles.panelWrong,
			]}
		>
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.detail}>{detailLine}</Text>
			{explanation.trim().length > 0 ? (
				<Text style={styles.hint}>{explanation}</Text>
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
})
