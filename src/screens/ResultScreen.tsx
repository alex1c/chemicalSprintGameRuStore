import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
	runResultExitWithOptionalInterstitial,
	type AdsPersistedState,
} from '../ads'
import { trackEvent } from '../analytics'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { ROUTES } from '../constants/routes'
import { ACHIEVEMENT_BY_ID } from '../achievements'
import { getElementByAtomicNumber } from '../data/chemistry'
import {
	hapticAchievement,
	hapticDailyCompleted,
} from '../haptics'
import { useHapticsEnabled } from '../hooks/useHapticsEnabled'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getGameModeConfig } from '../modes'
import type { RootStackParamList } from '../navigation/types'
import { loadAdsState, saveAdsState } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>

function resultHeadline(
	modeId: string,
	accuracy: number,
	correctCount: number,
	total: number,
	focusAtomicNumber?: number,
	isDailyReplay?: boolean,
): string {
	if (modeId === 'DAILY') {
		return isDailyReplay ? 'Сегодняшний результат' : 'Спринт дня завершён'
	}
	if (modeId === 'ELEMENT_TRAINING') {
		const element = focusAtomicNumber
			? getElementByAtomicNumber(focusAtomicNumber)
			: null
		return element
			? `Тренировка ${element.symbol} завершена`
			: 'Тренировка элемента завершена'
	}
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
 * Mode-aware post-session summary. Restart keeps the same mode / element / daily.
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
		focusAtomicNumber,
		dailyDateKey,
		isDailyFirstCompletion,
		dailyBonusGranted = 0,
		dailyCurrentStreak = 0,
		dailyStreakGrew,
		dailyNewStreakStarted,
		isDailyReplay,
		newlyUnlockedAchievementIds = [],
	} = route.params

	const mode = getGameModeConfig(modeId)
	const isElementTraining = modeId === 'ELEMENT_TRAINING'
	const isDaily = modeId === 'DAILY'
	const answered = correctCount + wrongCount
	const accuracyPct = Math.round(accuracy * 100)
	const headline = resultHeadline(
		modeId,
		accuracy,
		correctCount,
		mode.endCondition === 'fixed_count' ? questionCount : answered,
		focusAtomicNumber,
		isDailyReplay,
	)
	const isPerfect =
		mode.endCondition === 'fixed_count' &&
		correctCount === questionCount &&
		questionCount > 0

	const hapticsEnabled = useHapticsEnabled()
	const reduceMotion = useReducedMotion()
	const rewardScale = useRef(new Animated.Value(reduceMotion ? 1 : 0.85)).current
	const rewardOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current
	const celebrationFired = useRef(false)
	const exitBusyRef = useRef(false)
	const adsStateRef = useRef<AdsPersistedState | null>(null)

	useEffect(() => {
		void loadAdsState().then((ads) => {
			adsStateRef.current = ads
		})
		trackEvent('game_completed', {
			mode: modeId,
			score,
			correctCount,
			accuracy: accuracyPct,
		})
		if (isDaily && isDailyFirstCompletion) {
			trackEvent('daily_completed', {
				streak: dailyCurrentStreak,
			})
		}
		for (const id of newlyUnlockedAchievementIds) {
			trackEvent('achievement_unlocked', { achievementId: id })
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount
	}, [])

	const exitWithOptionalAd = (navigate: () => void) => {
		void (async () => {
			const ads = adsStateRef.current ?? (await loadAdsState())
			adsStateRef.current = ads
			await runResultExitWithOptionalInterstitial({
				adsState: ads,
				modeId,
				completed: true,
				busyRef: exitBusyRef,
				persistInterstitialShown: async (next) => {
					adsStateRef.current = next
					await saveAdsState(next)
				},
				navigate,
			})
		})()
	}

	useEffect(() => {
		if (celebrationFired.current) {
			return
		}
		celebrationFired.current = true
		if (newlyUnlockedAchievementIds.length > 0) {
			hapticAchievement(hapticsEnabled)
		} else if (isDaily && isDailyFirstCompletion) {
			hapticDailyCompleted(hapticsEnabled)
		}
	}, [
		hapticsEnabled,
		isDaily,
		isDailyFirstCompletion,
		newlyUnlockedAchievementIds.length,
	])

	useEffect(() => {
		if (reduceMotion) {
			rewardScale.setValue(1)
			rewardOpacity.setValue(1)
			return
		}
		rewardScale.setValue(0.85)
		rewardOpacity.setValue(0)
		Animated.parallel([
			Animated.timing(rewardOpacity, {
				toValue: 1,
				duration: theme.motion.rewardAppear,
				useNativeDriver: true,
			}),
			Animated.spring(rewardScale, {
				toValue: 1,
				friction: 6,
				tension: 120,
				useNativeDriver: true,
			}),
		]).start()
	}, [reduceMotion, rewardOpacity, rewardScale, atomsEarned])

	return (
		<Screen edges={['top', 'left', 'right', 'bottom']}>
			<View style={styles.content}>
				<Text style={styles.emoji}>{mode.icon}</Text>
				<Text style={styles.modeTitle}>{mode.titleRu}</Text>
				<Text style={styles.headline}>{headline}</Text>
				{isPerfect && !isElementTraining && !isDailyReplay ? (
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
				{!isElementTraining ? (
					<>
						<Text style={styles.meta}>Очки: {score}</Text>
						<Text style={styles.meta}>
							🔥 Лучшая серия: {bestStreak}
						</Text>
					</>
				) : null}

				{isDaily ? (
					<Text style={styles.dailyStreak}>
						🔥 Серия: {dailyCurrentStreak}{' '}
						{dailyCurrentStreak === 1 ? 'день' : 'дней'}
					</Text>
				) : null}
				{isDaily && dailyStreakGrew ? (
					<Text style={styles.streakNote}>Серия продолжается!</Text>
				) : null}
				{isDaily && dailyNewStreakStarted && isDailyFirstCompletion ? (
					<Text style={styles.streakNote}>
						Новая серия: 1 день
					</Text>
				) : null}
				{isDaily && dailyBonusGranted > 0 ? (
					<Text style={styles.streakNote}>
						Бонус дня +{dailyBonusGranted} ⚛
					</Text>
				) : null}
				{isDaily && isDailyReplay ? (
					<Text style={styles.replayNote}>
						Повтор без начисления атомов
					</Text>
				) : null}

				{newlyUnlockedAchievementIds.length === 1 ? (
					<View style={styles.achievementBanner}>
						<Text style={styles.achievementTitle}>
							🏆 Новое достижение
						</Text>
						<Text style={styles.achievementName}>
							{ACHIEVEMENT_BY_ID[newlyUnlockedAchievementIds[0]!]
								?.titleRu ?? newlyUnlockedAchievementIds[0]}
						</Text>
						<Text style={styles.achievementDesc}>
							{ACHIEVEMENT_BY_ID[newlyUnlockedAchievementIds[0]!]
								?.descriptionRu ?? ''}
						</Text>
					</View>
				) : null}
				{newlyUnlockedAchievementIds.length > 1 ? (
					<View style={styles.achievementBanner}>
						<Text style={styles.achievementTitle}>
							🏆 {newlyUnlockedAchievementIds.length} новых достижения
						</Text>
						{newlyUnlockedAchievementIds.slice(0, 3).map((id) => (
							<Text key={id} style={styles.achievementName}>
								{ACHIEVEMENT_BY_ID[id]?.titleRu ?? id}
							</Text>
						))}
						<PrimaryButton
							label="СМОТРЕТЬ ДОСТИЖЕНИЯ"
							variant="secondary"
							accessibilityLabel="Открыть экран достижений"
							onPress={() => navigation.navigate(ROUTES.Achievements)}
						/>
					</View>
				) : null}

				<Animated.View
					style={[
						styles.atomsBlock,
						{
							opacity: rewardOpacity,
							transform: [{ scale: rewardScale }],
						},
					]}
				>
					<Text style={styles.atomsEarned}>⚛ +{atomsEarned}</Text>
					<Text style={styles.atomsBalance}>
						Заработано: +{atomsEarned} ⚛
					</Text>
					<Text style={styles.atomsBalance}>
						Баланс: {atomBalance} ⚛
					</Text>
				</Animated.View>

				{!isElementTraining && !isDailyReplay ? (
					<>
						<View style={styles.badges}>
							{rewardBreakdown.streakBonuses > 0 ? (
								<Badge
									text={`Серия +${rewardBreakdown.streakBonuses}`}
								/>
							) : null}
							{rewardBreakdown.newRecord > 0 ? (
								<Badge text={`Рекорд +${rewardBreakdown.newRecord}`} />
							) : null}
							{rewardBreakdown.perfect > 0 ? (
								<Badge
									text={`Идеально +${rewardBreakdown.perfect}`}
								/>
							) : null}
						</View>

						{!isDaily && (isNewBestScore || isNewModeRecord) ? (
							<View style={styles.recordBanner}>
								<Text style={styles.recordText}>
									Новый рекорд режима!
								</Text>
							</View>
						) : !isDaily ? (
							<Text style={styles.recordMuted}>
								Рекорд: {Math.max(previousBestScore, score)}
							</Text>
						) : null}
					</>
				) : null}
			</View>

			<View style={styles.actions}>
				{isElementTraining && focusAtomicNumber != null ? (
					<>
						<PrimaryButton
							label="ТРЕНИРОВАТЬ ЕЩЁ"
							accessibilityLabel="Тренировать этот элемент ещё раз"
							onPress={() =>
								exitWithOptionalAd(() =>
									navigation.replace(ROUTES.Game, {
										modeId: 'ELEMENT_TRAINING',
										focusAtomicNumber,
										sessionKey: Date.now(),
									}),
								)
							}
						/>
						<PrimaryButton
							label="К ПРОГРЕССУ"
							variant="secondary"
							accessibilityLabel="Вернуться к прогрессу"
							onPress={() =>
								exitWithOptionalAd(() =>
									navigation.navigate(ROUTES.Progress),
								)
							}
						/>
					</>
				) : isDaily ? (
					<>
						<PrimaryButton
							label="ПОВТОРИТЬ"
							accessibilityLabel="Повторить спринт дня"
							onPress={() =>
								exitWithOptionalAd(() =>
									navigation.replace(ROUTES.Game, {
										modeId: 'DAILY',
										dailyDateKey: dailyDateKey,
										sessionKey: Date.now(),
									}),
								)
							}
						/>
						<PrimaryButton
							label="НА ГЛАВНУЮ"
							variant="secondary"
							accessibilityLabel="Вернуться на главную"
							onPress={() =>
								exitWithOptionalAd(() =>
									navigation.navigate(ROUTES.Home),
								)
							}
						/>
					</>
				) : (
					<>
						<PrimaryButton
							label="ЕЩЁ РАЗ"
							accessibilityLabel="Сыграть ещё раз в тот же режим"
							onPress={() =>
								exitWithOptionalAd(() =>
									navigation.replace(ROUTES.Game, {
										modeId,
										sessionKey: Date.now(),
									}),
								)
							}
						/>
						<PrimaryButton
							label="НА ГЛАВНУЮ"
							variant="secondary"
							accessibilityLabel="Вернуться на главную"
							onPress={() =>
								exitWithOptionalAd(() =>
									navigation.navigate(ROUTES.Home),
								)
							}
						/>
					</>
				)}
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
	dailyStreak: {
		...theme.typography.subtitle,
		color: theme.colors.accent,
		marginTop: theme.spacing.sm,
	},
	streakNote: {
		...theme.typography.body,
		color: theme.colors.brandSoft,
		marginTop: theme.spacing.xxs,
	},
	replayNote: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.xs,
	},
	achievementBanner: {
		marginTop: theme.spacing.lg,
		width: '100%',
		backgroundColor: theme.colors.successSoft,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.success,
		padding: theme.spacing.md,
		gap: theme.spacing.xxs,
	},
	achievementTitle: {
		...theme.typography.subtitle,
		color: theme.colors.success,
	},
	achievementName: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		fontWeight: '700',
	},
	achievementDesc: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
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
