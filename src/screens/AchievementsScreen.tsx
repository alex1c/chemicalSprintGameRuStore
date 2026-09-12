import { useCallback, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Screen } from '../components/Screen'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import {
	ACHIEVEMENT_DEFINITIONS,
	CATEGORY_LABELS_RU,
	createEmptyAchievementsState,
	getAchievementProgress,
	type AchievementsPersistedState,
} from '../achievements'
import { createEmptyDailyState, type DailyStateV4 } from '../daily'
import {
	createDefaultModeStatsMap,
	type ElementStatsMap,
	type ModeStatsMap,
} from '../modes'
import type { RootStackParamList } from '../navigation/types'
import {
	loadAchievementsState,
	loadDailyState,
	loadElementStats,
	loadHomeStatistics,
	loadModeStats,
	syncAchievementsFromState,
} from '../stats'
import { DEFAULT_STATISTICS, type AppStatistics } from '../storage'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>

/**
 * Full achievements catalog with locked/unlocked cards and progress.
 */
export function AchievementsScreen(_props: Props) {
	const [achievements, setAchievements] = useState<AchievementsPersistedState>(
		createEmptyAchievementsState(),
	)
	const [statistics, setStatistics] =
		useState<AppStatistics>(DEFAULT_STATISTICS)
	const [elementStats, setElementStats] = useState<ElementStatsMap>({})
	const [modeStats, setModeStats] = useState<ModeStatsMap>(
		createDefaultModeStatsMap(),
	)
	const [daily, setDaily] = useState<DailyStateV4>(createEmptyDailyState())

	const refresh = useCallback(async () => {
		await syncAchievementsFromState()
		const [nextAchievements, stats, elements, modes, dailyState] =
			await Promise.all([
				loadAchievementsState(),
				loadHomeStatistics(),
				loadElementStats(),
				loadModeStats(),
				loadDailyState(),
			])
		setAchievements(nextAchievements)
		setStatistics(stats)
		setElementStats(elements)
		setModeStats(modes)
		setDaily(dailyState)
	}, [])

	useFocusEffect(
		useCallback(() => {
			void refresh()
		}, [refresh]),
	)

	const unlockedCount = ACHIEVEMENT_DEFINITIONS.filter((item) =>
		Boolean(achievements.unlocked[item.id]),
	).length

	return (
		<Screen edges={['left', 'right', 'bottom']}>
			<Text
				accessibilityRole="text"
				accessibilityLabel={`Разблокировано ${unlockedCount} из ${ACHIEVEMENT_DEFINITIONS.length}`}
				style={styles.summary}
			>
				Разблокировано: {unlockedCount} / {ACHIEVEMENT_DEFINITIONS.length}
			</Text>

			<FlatList
				data={[...ACHIEVEMENT_DEFINITIONS]}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.list}
				renderItem={({ item }) => {
					const unlock = achievements.unlocked[item.id]
					const unlocked = Boolean(unlock)
					const progress = getAchievementProgress(item.id, {
						statistics,
						elementStats,
						modeStats,
						daily,
					})
					return (
						<View
							style={[
								styles.card,
								unlocked ? styles.cardUnlocked : styles.cardLocked,
							]}
							accessibilityRole="summary"
							accessibilityLabel={`${item.titleRu}. ${unlocked ? 'Разблокировано' : 'Ещё не разблокировано'}. ${item.descriptionRu}`}
						>
							<Text style={styles.icon}>{unlocked ? item.icon : '🔒'}</Text>
							<View style={styles.body}>
								<Text style={styles.category}>
									{CATEGORY_LABELS_RU[item.category]}
								</Text>
								<Text style={styles.title}>{item.titleRu}</Text>
								<Text style={styles.desc}>{item.descriptionRu}</Text>
								{progress && !unlocked ? (
									<Text style={styles.progress}>
										Прогресс: {progress.current} / {progress.target}
									</Text>
								) : null}
								{unlocked ? (
									<Text style={styles.progressComplete}>Готово</Text>
								) : null}
								{unlocked && unlock ? (
									<Text style={styles.date}>
										{formatUnlockDate(unlock.unlockedAt)}
									</Text>
								) : null}
							</View>
						</View>
					)
				}}
			/>
		</Screen>
	)
}

function formatUnlockDate(iso: string): string {
	const ms = Date.parse(iso)
	if (!Number.isFinite(ms)) {
		return 'Получено'
	}
	const d = new Date(ms)
	const dd = String(d.getDate()).padStart(2, '0')
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const yyyy = d.getFullYear()
	return `Получено ${dd}.${mm}.${yyyy}`
}

const styles = StyleSheet.create({
	summary: {
		...theme.typography.subtitle,
		color: theme.colors.brand,
		marginBottom: theme.spacing.md,
	},
	list: {
		gap: theme.spacing.sm,
		paddingBottom: theme.spacing.xxl,
	},
	card: {
		flexDirection: 'row',
		gap: theme.spacing.md,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		padding: theme.spacing.md,
		minHeight: MIN_TOUCH_TARGET + 24,
	},
	cardUnlocked: {
		backgroundColor: theme.colors.successSoft,
		borderColor: theme.colors.success,
		...theme.shadows.card,
	},
	cardLocked: {
		backgroundColor: theme.colors.surfaceElevated,
		borderColor: theme.colors.border,
		opacity: 1,
	},
	icon: {
		fontSize: 28,
		marginTop: 2,
	},
	body: {
		flex: 1,
		gap: 2,
		minWidth: 0,
	},
	category: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
	},
	title: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
	},
	desc: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		lineHeight: 20,
	},
	progress: {
		...theme.typography.caption,
		color: theme.colors.brandSoft,
		fontWeight: '700',
		marginTop: theme.spacing.xxs,
	},
	progressComplete: {
		...theme.typography.caption,
		color: theme.colors.success,
		fontWeight: '700',
		marginTop: theme.spacing.xxs,
	},
	date: {
		...theme.typography.caption,
		color: theme.colors.success,
		marginTop: theme.spacing.xxs,
		fontWeight: '600',
	},
})
