import { useCallback, useMemo, useState } from 'react'
import {
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Screen } from '../components/Screen'
import { BannerAd } from '../ads'
import { trackEvent } from '../analytics'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { ROUTES } from '../constants/routes'
import { ELEMENTS, getElementByAtomicNumber } from '../data/chemistry'
import {
	filterAndSearchElements,
	getElementMastery,
	getElementTileAccessibilityLabel,
	getMasterySummary,
	type MasteryLevel,
	type ProgressFilter,
} from '../mastery'
import type { ElementStatsMap } from '../modes'
import type { RootStackParamList } from '../navigation/types'
import { loadElementStats } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>

const FILTERS: { id: ProgressFilter; label: string }[] = [
	{ id: 'ALL', label: 'Все' },
	{ id: 'UNSEEN', label: 'Не изучено' },
	{ id: 'LEARNING', label: 'Изучается' },
	{ id: 'FAMILIAR', label: 'Знаком' },
	{ id: 'MASTERED', label: 'Освоено' },
	{ id: 'WEAK', label: 'Слабые' },
]

const MASTERY_MARKER: Record<MasteryLevel, string> = {
	UNSEEN: '○',
	LEARNING: '◐',
	FAMILIAR: '◑',
	MASTERED: '●',
}

/**
 * Full 118-element mastery progress hub.
 */
export function ProgressScreen({ navigation }: Props) {
	const [elementStats, setElementStats] = useState<ElementStatsMap>({})
	const [filter, setFilter] = useState<ProgressFilter>('ALL')
	const [query, setQuery] = useState('')

	const refresh = useCallback(async () => {
		const stats = await loadElementStats()
		setElementStats(stats)
	}, [])

	useFocusEffect(
		useCallback(() => {
			trackEvent('progress_opened')
			void refresh()
		}, [refresh]),
	)

	const summary = useMemo(
		() => getMasterySummary(elementStats, ELEMENTS.length),
		[elementStats],
	)

	const visibleAtomicNumbers = useMemo(
		() =>
			filterAndSearchElements(
				elementStats,
				filter,
				query,
				ELEMENTS.length,
			),
		[elementStats, filter, query],
	)

	const allMastered = summary.mastered === summary.total && summary.total > 0
	const neverPlayed = summary.unseen === summary.total

	return (
		<Screen edges={['left', 'right', 'bottom']}>
			<View style={styles.summaryCard}>
				<Text style={styles.summaryTitle}>Освоено</Text>
				<Text
					accessibilityRole="text"
					accessibilityLabel={`Освоено ${summary.mastered} из ${summary.total}`}
					style={styles.summaryScore}
				>
					{summary.mastered} / {summary.total}
				</Text>
				<View style={styles.barTrack}>
					<View
						style={[
							styles.barFill,
							{ width: `${Math.min(100, summary.progressPercent)}%` },
						]}
					/>
				</View>
				<Text style={styles.overallLabel}>Общий прогресс</Text>
				<View style={styles.breakdown}>
					<BreakdownChip
						label="Освоено"
						value={summary.mastered}
						marker={MASTERY_MARKER.MASTERED}
					/>
					<BreakdownChip
						label="Знаком"
						value={summary.familiar}
						marker={MASTERY_MARKER.FAMILIAR}
					/>
					<BreakdownChip
						label="Изучается"
						value={summary.learning}
						marker={MASTERY_MARKER.LEARNING}
					/>
					<BreakdownChip
						label="Не изучено"
						value={summary.unseen}
						marker={MASTERY_MARKER.UNSEEN}
					/>
				</View>
				{allMastered ? (
					<Text style={styles.celebration}>
						Все 118 элементов освоены!
					</Text>
				) : null}
				{neverPlayed ? (
					<Text style={styles.hint}>
						Сыграй первый спринт — здесь появится твой прогресс.
					</Text>
				) : null}
			</View>

			<TextInput
				value={query}
				onChangeText={setQuery}
				placeholder="Поиск: Fe, Железо, 26"
				placeholderTextColor={theme.colors.textSecondary}
				accessibilityLabel="Поиск элементов"
				style={styles.search}
				autoCorrect={false}
				autoCapitalize="none"
				clearButtonMode="while-editing"
			/>

			<View style={styles.filters}>
				{FILTERS.map((item) => {
					const active = filter === item.id
					return (
						<Pressable
							key={item.id}
							accessibilityRole="button"
							accessibilityState={{ selected: active }}
							accessibilityLabel={`Фильтр ${item.label}`}
							onPress={() => setFilter(item.id)}
							style={[
								styles.filterChip,
								active ? styles.filterChipActive : null,
							]}
						>
							<Text
								style={[
									styles.filterText,
									active ? styles.filterTextActive : null,
								]}
							>
								{item.label}
							</Text>
						</Pressable>
					)
				})}
			</View>

			<FlatList
				data={visibleAtomicNumbers}
				keyExtractor={(item) => String(item)}
				numColumns={4}
				contentContainerStyle={styles.gridContent}
				columnWrapperStyle={styles.gridRow}
				ListEmptyComponent={
					<Text style={styles.empty}>
						Нет элементов по текущему фильтру и поиску.
					</Text>
				}
				renderItem={({ item: atomicNumber }) => {
					const element = getElementByAtomicNumber(atomicNumber)
					if (!element) {
						return null
					}
					const mastery = getElementMastery(
						elementStats[String(atomicNumber)],
					)
					return (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={getElementTileAccessibilityLabel(
								element,
								elementStats,
							)}
							onPress={() =>
								navigation.navigate(ROUTES.ElementDetail, {
									atomicNumber,
								})
							}
							style={[
								styles.tile,
								masteryStyles[mastery],
							]}
						>
							<Text style={styles.tileMarker}>
								{MASTERY_MARKER[mastery]}
							</Text>
							<Text style={styles.tileNumber}>{atomicNumber}</Text>
							<Text style={styles.tileSymbol}>{element.symbol}</Text>
						</Pressable>
					)
				}}
			/>
			<BannerAd placement="secondary" />
		</Screen>
	)
}

function BreakdownChip({
	label,
	value,
	marker,
}: {
	label: string
	value: number
	marker: string
}) {
	return (
		<View style={styles.breakChip}>
			<Text style={styles.breakValue}>
				{marker} {value}
			</Text>
			<Text style={styles.breakLabel}>{label}</Text>
		</View>
	)
}

const masteryStyles = StyleSheet.create({
	UNSEEN: {
		borderStyle: 'dashed',
		borderColor: theme.colors.masteryUnseen,
		backgroundColor: theme.colors.surfaceElevated,
		opacity: 0.85,
	},
	LEARNING: {
		borderColor: theme.colors.masteryLearning,
		backgroundColor: theme.colors.warningSoft,
	},
	FAMILIAR: {
		borderColor: theme.colors.masteryFamiliar,
		backgroundColor: theme.colors.infoSoft,
	},
	MASTERED: {
		borderColor: theme.colors.masteryMastered,
		backgroundColor: theme.colors.successSoft,
	},
})

const styles = StyleSheet.create({
	summaryCard: {
		backgroundColor: theme.colors.surfaceElevated,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		padding: theme.spacing.md,
		marginBottom: theme.spacing.md,
		...theme.shadows.card,
	},
	summaryTitle: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
	},
	summaryScore: {
		...theme.typography.display,
		color: theme.colors.brand,
		marginVertical: theme.spacing.xxs,
	},
	barTrack: {
		height: 10,
		borderRadius: theme.radius.pill,
		backgroundColor: theme.colors.progressTrack,
		overflow: 'hidden',
		marginTop: theme.spacing.xs,
	},
	barFill: {
		height: '100%',
		backgroundColor: theme.colors.progressFill,
	},
	overallLabel: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.xxs,
	},
	breakdown: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: theme.spacing.xs,
		marginTop: theme.spacing.md,
	},
	breakChip: {
		flexGrow: 1,
		minWidth: '45%',
		backgroundColor: theme.colors.surfaceMuted,
		borderRadius: theme.radius.md,
		paddingVertical: theme.spacing.xs,
		paddingHorizontal: theme.spacing.sm,
	},
	breakValue: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
	},
	breakLabel: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
	},
	celebration: {
		...theme.typography.subtitle,
		color: theme.colors.success,
		marginTop: theme.spacing.md,
		textAlign: 'center',
	},
	hint: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.sm,
	},
	search: {
		...theme.typography.body,
		backgroundColor: theme.colors.surface,
		borderWidth: 1,
		borderColor: theme.colors.border,
		borderRadius: theme.radius.md,
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.sm,
		color: theme.colors.textPrimary,
		minHeight: MIN_TOUCH_TARGET,
		marginBottom: theme.spacing.sm,
	},
	filters: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: theme.spacing.xs,
		marginBottom: theme.spacing.sm,
	},
	filterChip: {
		borderRadius: theme.radius.pill,
		borderWidth: 1,
		borderColor: theme.colors.border,
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xxs,
		minHeight: 32,
		justifyContent: 'center',
		backgroundColor: theme.colors.surface,
	},
	filterChipActive: {
		backgroundColor: theme.colors.brand,
		borderColor: theme.colors.brand,
	},
	filterText: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		fontWeight: '600',
	},
	filterTextActive: {
		color: theme.colors.textInverse,
	},
	gridContent: {
		paddingBottom: theme.spacing.xxl,
		gap: theme.spacing.xs,
	},
	gridRow: {
		gap: theme.spacing.xs,
		marginBottom: theme.spacing.xs,
	},
	tile: {
		flex: 1,
		aspectRatio: 1,
		maxWidth: '24%',
		borderRadius: theme.radius.lg,
		borderWidth: 1.5,
		borderColor: theme.colors.border,
		backgroundColor: theme.colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
		padding: theme.spacing.xxs,
		minHeight: MIN_TOUCH_TARGET,
	},
	tileMarker: {
		position: 'absolute',
		top: 4,
		right: 6,
		fontSize: 10,
		color: theme.colors.textSecondary,
	},
	tileNumber: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
	},
	tileSymbol: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
		fontWeight: '700',
	},
	empty: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		textAlign: 'center',
		marginTop: theme.spacing.xl,
		paddingHorizontal: theme.spacing.lg,
		lineHeight: 22,
	},
})
