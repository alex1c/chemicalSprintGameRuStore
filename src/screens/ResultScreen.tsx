import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { ROUTES } from '../constants/routes'
import type { RootStackParamList } from '../navigation/types'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>

function resultHeadline(accuracy: number, correctCount: number, total: number): string {
	if (correctCount === total) {
		return 'Идеально!'
	}
	if (accuracy >= 0.8) {
		return 'Отличный результат!'
	}
	if (accuracy >= 0.5) {
		return 'Хороший результат!'
	}
	return 'Есть куда расти!'
}

/**
 * Post-session summary with restart / home actions.
 */
export function ResultScreen({ navigation, route }: Props) {
	const {
		score,
		correctCount,
		questionCount,
		accuracy,
		bestStreak,
		previousBestScore,
		isNewBestScore,
	} = route.params

	const accuracyPct = Math.round(accuracy * 100)
	const headline = resultHeadline(accuracy, correctCount, questionCount)

	return (
		<Screen edges={['top', 'left', 'right', 'bottom']}>
			<View style={styles.content}>
				<Text style={styles.emoji}>🧪</Text>
				<Text style={styles.headline}>{headline}</Text>
				<Text style={styles.scoreLine}>
					{correctCount} / {questionCount}
				</Text>
				<Text style={styles.meta}>{accuracyPct}% точность</Text>
				<Text style={styles.meta}>Очки: {score}</Text>
				<Text style={styles.meta}>🔥 Лучшая серия: {bestStreak}</Text>

				{isNewBestScore ? (
					<View style={styles.recordBanner}>
						<Text style={styles.recordText}>Новый рекорд!</Text>
					</View>
				) : (
					<Text style={styles.recordMuted}>
						Рекорд: {Math.max(previousBestScore, score)}
					</Text>
				)}
			</View>

			<View style={styles.actions}>
				<PrimaryButton
					label="ЕЩЁ РАЗ"
					accessibilityLabel="Сыграть ещё раз"
					onPress={() =>
						navigation.replace(ROUTES.Game, {
							sessionKey: Date.now(),
						})
					}
				/>
				<PrimaryButton
					label="НА ГЛАВНУЮ"
					variant="secondary"
					accessibilityLabel="Вернуться на главную"
					onPress={() => navigation.navigate(ROUTES.Home)}
				/>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.sm,
	},
	emoji: {
		fontSize: 44,
		marginBottom: theme.spacing.md,
	},
	headline: {
		...theme.typography.title,
		color: theme.colors.brand,
		textAlign: 'center',
		marginBottom: theme.spacing.md,
	},
	scoreLine: {
		...theme.typography.display,
		color: theme.colors.textPrimary,
		marginBottom: theme.spacing.sm,
	},
	meta: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		marginBottom: theme.spacing.xs,
	},
	recordBanner: {
		marginTop: theme.spacing.lg,
		backgroundColor: theme.colors.accentSoft,
		borderRadius: theme.radius.md,
		paddingVertical: theme.spacing.sm,
		paddingHorizontal: theme.spacing.lg,
	},
	recordText: {
		...theme.typography.subtitle,
		color: theme.colors.accent,
	},
	recordMuted: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.lg,
	},
	actions: {
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.sm,
	},
})
