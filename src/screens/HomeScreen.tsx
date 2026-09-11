import { useCallback, useEffect, useState } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { APP_DISPLAY_NAME } from '../constants/app'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { ROUTES } from '../constants/routes'
import type { RootStackParamList } from '../navigation/types'
import { loadHomeStatistics } from '../stats'
import { DEFAULT_STATISTICS, type AppStatistics } from '../storage'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

/**
 * Home hub: Play CTA is the dominant action (launch → Play → first question).
 */
export function HomeScreen({ navigation }: Props) {
	const [stats, setStats] = useState<AppStatistics>(DEFAULT_STATISTICS)
	const [ready, setReady] = useState(false)

	const refreshStats = useCallback(async () => {
		const next = await loadHomeStatistics()
		setStats(next)
		setReady(true)
	}, [])

	useFocusEffect(
		useCallback(() => {
			void refreshStats()
		}, [refreshStats]),
	)

	useEffect(() => {
		void refreshStats()
	}, [refreshStats])

	const hasHistory = stats.gamesPlayed > 0

	return (
		<Screen>
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

			<View style={styles.primaryWrap}>
				<PrimaryButton
					label="ИГРАТЬ"
					accessibilityLabel="Играть в классический спринт"
					onPress={() =>
						navigation.navigate(ROUTES.Game, {
							sessionKey: Date.now(),
						})
					}
				/>
			</View>

			<View style={styles.secondary}>
				<SecondaryLink
					label="Режимы"
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
			</View>
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
	hero: {
		alignItems: 'center',
		marginTop: theme.spacing.xl,
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
	primaryWrap: {
		marginTop: theme.spacing.md,
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
})
