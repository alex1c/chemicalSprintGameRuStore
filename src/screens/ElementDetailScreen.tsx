import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { ROUTES } from '../constants/routes'
import { getElementByAtomicNumber } from '../data/chemistry'
import {
	MASTERY_LABELS_RU,
	formatGroupLabel,
	formatLastSeenLabel,
	getCategoryLabelRu,
	getElementMastery,
	getFirstTryAccuracy,
} from '../mastery'
import {
	createEmptyElementPerformance,
	isWeakElement,
	weaknessScore,
	type ElementPerformance,
} from '../modes'
import type { RootStackParamList } from '../navigation/types'
import { loadElementStats } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'ElementDetail'>

/**
 * Per-element chemistry + performance detail with contextual training CTA.
 */
export function ElementDetailScreen({ navigation, route }: Props) {
	const atomicNumber = route.params.atomicNumber
	const element = getElementByAtomicNumber(atomicNumber)
	const [stats, setStats] = useState<ElementPerformance>(
		createEmptyElementPerformance(),
	)

	const refresh = useCallback(async () => {
		const map = await loadElementStats()
		setStats(map[String(atomicNumber)] ?? createEmptyElementPerformance())
	}, [atomicNumber])

	useFocusEffect(
		useCallback(() => {
			void refresh()
		}, [refresh]),
	)

	if (!element) {
		return (
			<Screen title="Элемент">
				<Text style={styles.body}>Элемент не найден.</Text>
			</Screen>
		)
	}

	const mastery = getElementMastery(stats)
	const firstTryPct = Math.round(getFirstTryAccuracy(stats) * 100)
	const shouldReview =
		stats.shown > 0 && (isWeakElement(stats) || weaknessScore(stats) >= 4)

	return (
		<Screen edges={['left', 'right', 'bottom']}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<Text style={styles.hero}>
					{element.atomicNumber} {element.symbol}
				</Text>
				<Text style={styles.name}>{element.nameRu}</Text>

				<View style={styles.card}>
					<InfoRow
						label="Атомный номер"
						value={String(element.atomicNumber)}
					/>
					<InfoRow
						label="Группа"
						value={formatGroupLabel(element.group)}
					/>
					<InfoRow label="Период" value={String(element.period)} />
					<InfoRow
						label="Категория"
						value={getCategoryLabelRu(element.category)}
					/>
				</View>

				<Text style={styles.section}>Статистика</Text>
				<View style={styles.card}>
					<InfoRow label="Показан" value={`${stats.shown} раз`} />
					<InfoRow
						label="Правильно с первого раза"
						value={String(stats.correct)}
					/>
					<InfoRow label="С ошибкой" value={String(stats.wrong)} />
					<InfoRow
						label="С подсказкой / второй попыткой"
						value={String(stats.assistedCorrect)}
					/>
					<InfoRow
						label="Точность"
						value={stats.shown === 0 ? '—' : `${firstTryPct}%`}
					/>
					<InfoRow
						label="Последняя тренировка"
						value={formatLastSeenLabel(stats.lastSeenAt)}
					/>
				</View>

				<Text style={styles.section}>Статус</Text>
				<Text style={styles.mastery}>{MASTERY_LABELS_RU[mastery]}</Text>
				{shouldReview ? (
					<Text style={styles.reviewHint}>Стоит повторить</Text>
				) : null}

				<PrimaryButton
					label="ТРЕНИРОВАТЬ ЭЛЕМЕНТ"
					accessibilityLabel={`Тренировать элемент ${element.symbol}`}
					onPress={() =>
						navigation.navigate(ROUTES.Game, {
							modeId: 'ELEMENT_TRAINING',
							focusAtomicNumber: element.atomicNumber,
							sessionKey: Date.now(),
						})
					}
				/>
			</ScrollView>
		</Screen>
	)
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.row}>
			<Text style={styles.rowLabel}>{label}</Text>
			<Text style={styles.rowValue}>{value}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: theme.spacing.xxl,
		gap: theme.spacing.sm,
	},
	hero: {
		...theme.typography.display,
		color: theme.colors.brand,
	},
	name: {
		...theme.typography.title,
		color: theme.colors.textPrimary,
		marginBottom: theme.spacing.sm,
	},
	section: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
		marginTop: theme.spacing.sm,
	},
	card: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		padding: theme.spacing.md,
		gap: theme.spacing.xs,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: theme.spacing.md,
	},
	rowLabel: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		flex: 1,
	},
	rowValue: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		fontWeight: '600',
		textAlign: 'right',
		flexShrink: 1,
	},
	mastery: {
		...theme.typography.title,
		color: theme.colors.brandSoft,
	},
	reviewHint: {
		...theme.typography.body,
		color: theme.colors.accent,
		marginBottom: theme.spacing.sm,
	},
	body: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
	},
})
