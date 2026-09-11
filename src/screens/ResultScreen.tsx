import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { ROUTES } from '../constants/routes'
import { getGameModeConfig } from '../modes'
import type { RootStackParamList } from '../navigation/types'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>

function resultHeadline(
	modeId: string,
	accuracy: number,
	correctCount: number,
	total: number,
): string {
	if (modeId === 'WEAK_ELEMENTS') {
		return 'Тренировка слабых элементов завершена'
	}
	if (modeId === 'NO_MISTAKE') {
		return correctCount > 0 ? 'Отличная серия!' : 'Попробуйте ещё'
	}
	if (modeId === 'TIMED_60') {
		return 'Минута закончилась!'
	}
	if (correctCount === total && total > 0) {
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
 * Mode-aware post-session summary. Restart keeps the same mode.
 */
export function ResultScreen({ navigation, route }: Props) {
	const {
		modeId,
		score,
		correctCount,
		questionCount,
		wrongCount,
		accuracy,
		bestStreak,
		previousBestScore,
		isNewBestScore,
		isNewModeRecord,
		atomsEarned,
		atomBalance,
		rewardBreakdown,
	} = route.params

	const mode = getGameModeConfig(modeId)
	const answered = correctCount + wrongCount
	const accuracyPct = Math.round(accuracy * 100)
	const headline = resultHeadline(
		modeId,
		accuracy,
		correctCount,
		mode.endCondition === 'fixed_count' ? questionCount : answered,
	)
	const isPerfect =
		mode.endCondition === 'fixed_count' &&
		correctCount === questionCount &&
		questionCount > 0

	return (
		<Screen edges={['top', 'left', 'right', 'bottom']}>
			<View style={styles.content}>
				<Text style={styles.emoji}>{mode.icon}</Text>
				<Text style={styles.modeTitle}>{mode.titleRu}</Text>
				<Text style={styles.headline}>{headline}</Text>
				{isPerfect ? (
					<Text style={styles.perfect}>Идеальный спринт!</Text>
				) : null}

				{mode.endCondition === 'fixed_count' ? (
					<Text style={styles.scoreLine}>
						{correctCount} / {questionCount}
					</Text>
				) : mode.endCondition === 'until_mistake' ? (
					<Text style={styles.scoreLine}>{correctCount} верных</Text>
				) : (
					<Text style={styles.scoreLine}>
						{correctCount} верных из {answered}
					</Text>
				)}

				<Text style={styles.meta}>{accuracyPct}% точность</Text>
				<Text style={styles.meta}>Очки: {score}</Text>
				<Text style={styles.meta}>🔥 Лучшая серия: {bestStreak}</Text>

				<View style={styles.atomsBlock}>
					<Text style={styles.atomsEarned}>⚛ +{atomsEarned}</Text>
					<Text style={styles.atomsBalance}>
						Заработано: +{atomsEarned} ⚛
					</Text>
					<Text style={styles.atomsBalance}>
						Баланс: {atomBalance} ⚛
					</Text>
				</View>

				<View style={styles.badges}>
					{rewardBreakdown.streakBonuses > 0 ? (
						<Badge text={`Серия +${rewardBreakdown.streakBonuses}`} />
					) : null}
					{rewardBreakdown.newRecord > 0 ? (
						<Badge text={`Рекорд +${rewardBreakdown.newRecord}`} />
					) : null}
					{rewardBreakdown.perfect > 0 ? (
						<Badge text={`Идеально +${rewardBreakdown.perfect}`} />
					) : null}
				</View>

				{isNewBestScore || isNewModeRecord ? (
					<View style={styles.recordBanner}>
						<Text style={styles.recordText}>Новый рекорд режима!</Text>
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
					accessibilityLabel="Сыграть ещё раз в тот же режим"
					onPress={() =>
						navigation.replace(ROUTES.Game, {
							modeId,
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
		marginBottom: theme.spacing.sm,
	},
	modeTitle: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginBottom: theme.spacing.xs,
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
