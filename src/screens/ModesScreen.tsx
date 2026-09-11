import { useCallback, useEffect, useState } from 'react'
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Screen } from '../components/Screen'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { ROUTES } from '../constants/routes'
import {
	GAME_MODE_ORDER,
	getGameModeConfig,
	getWeakModeAvailability,
	type GameModeId,
	type ModeStatsMap,
} from '../modes'
import type { RootStackParamList } from '../navigation/types'
import { loadElementStats, loadModeStats } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Modes'>

/**
 * Real Modes hub — start any PHASE 5 game mode.
 */
export function ModesScreen({ navigation }: Props) {
	const [modeStats, setModeStats] = useState<ModeStatsMap | null>(null)
	const [weakReady, setWeakReady] = useState(true)

	const refresh = useCallback(async () => {
		const [stats, elementStats] = await Promise.all([
			loadModeStats(),
			loadElementStats(),
		])
		setModeStats(stats)
		setWeakReady(getWeakModeAvailability(elementStats).available)
	}, [])

	useFocusEffect(
		useCallback(() => {
			void refresh()
		}, [refresh]),
	)

	useEffect(() => {
		void refresh()
	}, [refresh])

	const startMode = (modeId: GameModeId) => {
		navigation.navigate(ROUTES.Game, {
			modeId,
			sessionKey: Date.now(),
		})
	}

	return (
		<Screen title="Режимы" subtitle="Выберите ритм тренировки">
			<ScrollView
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
			>
				{GAME_MODE_ORDER.map((modeId) => {
					const config = getGameModeConfig(modeId)
					const stats = modeStats?.[modeId]
					const record =
						config.recordField === 'bestCorrect'
							? stats?.bestCorrect ?? 0
							: stats?.bestScore ?? 0
					const recordLabel =
						config.recordField === 'bestCorrect'
							? `Рекорд: ${record} верных`
							: `Рекорд: ${record}`

					return (
						<Pressable
							key={modeId}
							accessibilityRole="button"
							accessibilityLabel={`${config.titleRu}. ${config.descriptionRu}`}
							onPress={() => startMode(modeId)}
							style={({ pressed }) => [
								styles.card,
								pressed ? styles.cardPressed : null,
							]}
						>
							<Text style={styles.icon}>{config.icon}</Text>
							<View style={styles.cardBody}>
								<Text style={styles.cardTitle}>{config.titleRu}</Text>
								<Text style={styles.cardDesc}>
									{config.descriptionRu}
								</Text>
								<Text style={styles.cardRecord}>
									{stats && stats.gamesPlayed > 0
										? recordLabel
										: 'Ещё нет рекорда'}
								</Text>
								{modeId === 'WEAK_ELEMENTS' && !weakReady ? (
									<Text style={styles.weakNote}>
										Мало данных — подскажем, что повторить, после
										нескольких спринтов
									</Text>
								) : null}
							</View>
						</Pressable>
					)
				})}
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	list: {
		gap: theme.spacing.sm,
		paddingBottom: theme.spacing.xl,
	},
	card: {
		flexDirection: 'row',
		gap: theme.spacing.md,
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		padding: theme.spacing.md,
		minHeight: MIN_TOUCH_TARGET + 24,
		...theme.shadows.card,
	},
	cardPressed: {
		backgroundColor: theme.colors.surfaceMuted,
	},
	icon: {
		fontSize: 28,
		marginTop: 2,
	},
	cardBody: {
		flex: 1,
		gap: 2,
	},
	cardTitle: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
	},
	cardDesc: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
	},
	cardRecord: {
		...theme.typography.caption,
		color: theme.colors.brandSoft,
		marginTop: theme.spacing.xxs,
		fontWeight: '600',
	},
	weakNote: {
		...theme.typography.caption,
		color: theme.colors.accent,
		marginTop: theme.spacing.xxs,
	},
})
