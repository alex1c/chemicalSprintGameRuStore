import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { ROUTES } from '../constants/routes'
import type { RootStackParamList } from '../navigation/types'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>

function resultHeadline(
	accuracy: number,
	correctCount: number,
	total: number,
): string {
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
 * Post-session summary with atom rewards and restart / home actions.
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
		atomsEarned,
		atomBalance,
		rewardBreakdown,
	} = route.params

	const accuracyPct = Math.round(accuracy * 100)
	const headline = resultHeadline(accuracy, correctCount, questionCount)
	const isPerfect = correctCount === questionCount && questionCount > 0

	return (
		<Screen edges={['top', 'left', 'right', 'bottom']}>
			<View style={styles.content}>
				<Text style={styles.emoji}>🧪</Text>
				<Text style={styles.headline}>{headline}</Text>
				{isPerfect ? (
					<Text style={styles.perfect}>Идеальный спринт!</Text>
				) : null}
				<Text style={styles.scoreLine}>
					{correctCount} / {questionCount}
				</Text>
				<Text style={styles.meta}>{accuracyPct}% точность</Text>
				<Text style={styles.meta}>Очки: {score}</Text>
				<Text style={styles.meta}>🔥 Лучшая серия: {bestStreak}</Text>

				<View style={styles.atomsBlock}>
					<Text style={styles.atomsEarned}>⚛ +{atomsEarned}</Text>
					<Text style={styles.atomsBalance}>
						Заработано за спринт: +{atomsEarned} ⚛
					</Text>
					<Text style={styles.atomsBalance}>
						Баланс: {atomBalance} ⚛
					</Text>
				</View>

				<View style={styles.badges}>
					{rewardBreakdown.streakBonuses > 0 ? (
						<Badge
							text={`Серия +${rewardBreakdown.streakBonuses}`}
						/>
					) : null}
					{rewardBreakdown.newRecord > 0 ? (
						<Badge text={`Новый рекорд +${rewardBreakdown.newRecord}`} />
					) : null}
					{rewardBreakdown.perfect > 0 ? (
						<Badge text={`Идеально +${rewardBreakdown.perfect}`} />
					) : null}
				</View>

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

function Badge({ text }: { text: string }) {
	return (
		<View style={styles.badge}>
			<Text style={styles.badgeText}>{text}</Text>
		</View>
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
		marginBottom: theme.spacing.sm,
	},
	perfect: {
		...theme.typography.subtitle,
		color: theme.colors.accent,
		marginBottom: theme.spacing.sm,
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
	atomsBlock: {
		marginTop: theme.spacing.lg,
		alignItems: 'center',
		gap: theme.spacing.xxs,
	},
	atomsEarned: {
		...theme.typography.title,
		color: theme.colors.brand,
	},
	atomsBalance: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
	},
	badges: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: theme.spacing.xs,
		marginTop: theme.spacing.md,
	},
	badge: {
		backgroundColor: theme.colors.surfaceMuted,
		borderRadius: theme.radius.pill,
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xxs,
	},
	badgeText: {
		...theme.typography.caption,
		color: theme.colors.brand,
		fontWeight: '600',
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
