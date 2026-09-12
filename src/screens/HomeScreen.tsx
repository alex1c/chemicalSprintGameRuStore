import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { AtomBalanceChip } from '../components/game'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { APP_DISPLAY_NAME } from '../constants/app'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { ROUTES } from '../constants/routes'
import {
	DAILY_COMPLETION_BONUS,
	createEmptyDailyState,
	getLocalDateKey,
	getTodayDailyState,
	type DailyStateV4,
	type TodayDailyView,
} from '../daily'
import type { RootStackParamList } from '../navigation/types'
import { loadAtomWallet, loadDailyState, loadHomeStatistics } from '../stats'
import { DEFAULT_STATISTICS, type AppStatistics } from '../storage'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

/**
 * Home hub: Play CTA is the dominant action (launch → Play → first question).
 */
export function HomeScreen({ navigation }: Props) {
	const [stats, setStats] = useState<AppStatistics>(DEFAULT_STATISTICS)
	const [atomBalance, setAtomBalance] = useState(0)
	const [daily, setDaily] = useState<DailyStateV4>(createEmptyDailyState())
	const [ready, setReady] = useState(false)

	const refresh = useCallback(async () => {
		const [nextStats, wallet, dailyState] = await Promise.all([
			loadHomeStatistics(),
			loadAtomWallet(),
			loadDailyState(),
		])
		setStats(nextStats)
		setAtomBalance(wallet.balance)
		setDaily(dailyState)
		setReady(true)
	}, [])

	useFocusEffect(
		useCallback(() => {
			void refresh()
		}, [refresh]),
	)

	useEffect(() => {
		void refresh()
	}, [refresh])

	const todayKey = getLocalDateKey()
	const todayDaily: TodayDailyView = useMemo(
		() => getTodayDailyState(daily, todayKey),
		[daily, todayKey],
	)

	const hasHistory = stats.gamesPlayed > 0

	const startDaily = () => {
		navigation.navigate(ROUTES.Game, {
			modeId: 'DAILY',
			dailyDateKey: todayKey,
			sessionKey: Date.now(),
		})
	}

	return (
		<Screen>
			<View style={styles.balanceRow}>
				<AtomBalanceChip balance={atomBalance} ready={ready} />
			</View>

			<View style={styles.hero}>
				<Text style={styles.atom}>⚛</Text>
				<Text style={styles.title}>{APP_DISPLAY_NAME}</Text>
				<Text style={styles.subtitle}>
					10 быстрых вопросов по таблице Менделеева
				</Text>
			</View>

			<View style={styles.statsRow}>
				<StatChip
					label="Рекорд"
					value={ready ? String(stats.bestScore) : '—'}
				/>
				<StatChip
					label="Партий"
					value={ready ? String(stats.gamesPlayed) : '—'}
				/>
				<StatChip
					label="🔥 Серия"
					value={ready ? String(stats.bestStreak) : '—'}
				/>
			</View>

			{!hasHistory && ready ? (
				<Text style={styles.emptyHint}>
					Сыграйте первую партию — здесь появится ваш рекорд.
				</Text>
			) : null}

			<Pressable
				accessibilityRole="button"
				accessibilityLabel={
					todayDaily.completed
						? `Спринт дня уже сыгран. Сегодня ${todayDaily.entry?.bestCorrect ?? 0} из 10. Серия ${todayDaily.currentStreak} дней`
						: `Спринт дня. 10 вопросов. Бонус плюс ${DAILY_COMPLETION_BONUS} атомов`
				}
				onPress={startDaily}
				style={({ pressed }) => [
					styles.dailyCard,
					todayDaily.completed ? styles.dailyCardDone : null,
					pressed ? styles.dailyCardPressed : null,
				]}
			>
				<Text style={styles.dailyIcon}>🧪</Text>
				<View style={styles.dailyBody}>
					<Text style={styles.dailyTitle}>
						Спринт дня{todayDaily.completed ? ' ✓' : ''}
					</Text>
					{todayDaily.completed ? (
						<>
							<Text style={styles.dailyMeta}>
								Сегодня:{' '}
								{todayDaily.entry?.bestCorrect ?? 0}/10
							</Text>
							<Text style={styles.dailyMeta}>
								🔥 Серия: {todayDaily.currentStreak} дней
							</Text>
							<Text style={styles.dailyCtaSecondary}>ПОВТОРИТЬ</Text>
						</>
					) : (
						<>
							<Text style={styles.dailyMeta}>
								10 вопросов · бонус +{DAILY_COMPLETION_BONUS} ⚛
							</Text>
							{todayDaily.currentStreak > 0 ? (
								<Text style={styles.dailyMeta}>
									🔥 Серия: {todayDaily.currentStreak} дней
								</Text>
							) : (
								<Text style={styles.dailyMeta}>
									Первый спринт дня — лови бонус
								</Text>
							)}
							<Text style={styles.dailyCta}>ИГРАТЬ</Text>
						</>
					)}
				</View>
			</Pressable>

			<View style={styles.primaryWrap}>
				<PrimaryButton
					label="ИГРАТЬ"
					accessibilityLabel="Играть в классический спринт"
					onPress={() =>
						navigation.navigate(ROUTES.Game, {
							modeId: 'CLASSIC',
							sessionKey: Date.now(),
						})
					}
				/>
			</View>

			<View style={styles.secondary}>
				<SecondaryLink
					label="Другие режимы"
					onPress={() => navigation.navigate(ROUTES.Modes)}
				/>
				<SecondaryLink
					label="Прогресс"
					onPress={() => navigation.navigate(ROUTES.Progress)}
				/>
				<SecondaryLink
					label="Обучение"
					onPress={() => navigation.navigate(ROUTES.Learn)}
				/>
				<SecondaryLink
					label="Достижения"
					onPress={() => navigation.navigate(ROUTES.Achievements)}
				/>
			</View>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Настройки"
				onPress={() => navigation.navigate(ROUTES.Settings)}
				style={styles.settingsButton}
			>
				<Text style={styles.settingsText}>⚙ Настройки</Text>
			</Pressable>
		</Screen>
	)
}

function StatChip({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.chip}>
			<Text style={styles.chipValue}>{value}</Text>
			<Text style={styles.chipLabel}>{label}</Text>
		</View>
	)
}

function SecondaryLink({
	label,
	onPress,
}: {
	label: string
	onPress: () => void
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			style={styles.secondaryLink}
		>
			<Text style={styles.secondaryText}>{label}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	balanceRow: {
		alignItems: 'flex-end',
		marginBottom: theme.spacing.sm,
	},
	hero: {
		alignItems: 'center',
		marginTop: theme.spacing.md,
		marginBottom: theme.spacing.lg,
	},
	atom: {
		fontSize: 40,
		marginBottom: theme.spacing.sm,
	},
	title: {
		...theme.typography.display,
		color: theme.colors.brand,
		textAlign: 'center',
	},
	subtitle: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		textAlign: 'center',
		marginTop: theme.spacing.sm,
		paddingHorizontal: theme.spacing.md,
	},
	statsRow: {
		flexDirection: 'row',
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.md,
	},
	chip: {
		flex: 1,
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.md,
		borderWidth: 1,
		borderColor: theme.colors.border,
		paddingVertical: theme.spacing.sm,
		paddingHorizontal: theme.spacing.xs,
		alignItems: 'center',
		minHeight: MIN_TOUCH_TARGET,
		justifyContent: 'center',
	},
	chipValue: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
	},
	chipLabel: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: 2,
	},
	emptyHint: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		textAlign: 'center',
		marginBottom: theme.spacing.md,
	},
	dailyCard: {
		flexDirection: 'row',
		gap: theme.spacing.md,
		backgroundColor: theme.colors.accentSoft,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.accent,
		padding: theme.spacing.md,
		marginBottom: theme.spacing.md,
		minHeight: MIN_TOUCH_TARGET + 16,
		alignItems: 'center',
	},
	dailyCardDone: {
		backgroundColor: theme.colors.surfaceElevated,
		borderColor: theme.colors.success,
	},
	dailyCardPressed: {
		opacity: 0.9,
		backgroundColor: theme.colors.surfaceMuted,
	},
	dailyIcon: {
		fontSize: 28,
	},
	dailyBody: {
		flex: 1,
		gap: 2,
	},
	dailyTitle: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
	},
	dailyMeta: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
	},
	dailyCta: {
		...theme.typography.caption,
		color: theme.colors.accent,
		fontWeight: '700',
		marginTop: theme.spacing.xxs,
	},
	dailyCtaSecondary: {
		...theme.typography.caption,
		color: theme.colors.brandSoft,
		fontWeight: '700',
		marginTop: theme.spacing.xxs,
	},
	primaryWrap: {
		marginTop: theme.spacing.xs,
	},
	secondary: {
		marginTop: theme.spacing.xl,
		gap: theme.spacing.xs,
		alignItems: 'center',
	},
	secondaryLink: {
		minHeight: MIN_TOUCH_TARGET,
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.md,
	},
	secondaryText: {
		...theme.typography.body,
		color: theme.colors.brandSoft,
		fontWeight: '600',
	},
	settingsButton: {
		marginTop: theme.spacing.md,
		alignSelf: 'center',
		minHeight: MIN_TOUCH_TARGET,
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.md,
	},
	settingsText: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		fontWeight: '600',
	},
})
