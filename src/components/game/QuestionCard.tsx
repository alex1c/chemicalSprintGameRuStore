import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme'

interface QuestionCardProps {
	prompt: string
	typeLabel?: string
}

/**
 * Central question card for Classic Sprint.
 */
export function QuestionCard({ prompt, typeLabel }: QuestionCardProps) {
	return (
		<View style={styles.card}>
			{typeLabel ? <Text style={styles.type}>{typeLabel}</Text> : null}
			<Text style={styles.prompt}>{prompt}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.lg,
		padding: theme.spacing.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		...theme.shadows.card,
	},
	type: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginBottom: theme.spacing.xs,
	},
	prompt: {
		...theme.typography.title,
		fontSize: 22,
		lineHeight: 30,
		color: theme.colors.textPrimary,
	},
})
