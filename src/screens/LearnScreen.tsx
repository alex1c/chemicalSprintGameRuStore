import { useCallback, useState } from 'react'
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
import { BannerAd } from '../ads'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { ROUTES } from '../constants/routes'
import { LEARNING_ARTICLES } from '../learning'
import type { RootStackParamList } from '../navigation/types'
import { loadLearningVisited } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Learn'>

/**
 * Learning hub — reference mini-course cards.
 */
export function LearnScreen({ navigation }: Props) {
	const [visited, setVisited] = useState<string[]>([])

	useFocusEffect(
		useCallback(() => {
			void loadLearningVisited().then(setVisited)
		}, []),
	)

	return (
		<Screen edges={['left', 'right', 'bottom']}>
			<Text style={styles.intro}>
				Короткие справки по таблице и правилам игры — без школьного учебника
				на 20 страниц.
			</Text>
			<Text style={styles.progress}>
				Прочитано: {visited.length} / {LEARNING_ARTICLES.length}
			</Text>
			<ScrollView contentContainerStyle={styles.list}>
				{LEARNING_ARTICLES.map((article) => {
					const isVisited = visited.includes(article.id)
					return (
						<Pressable
							key={article.id}
							accessibilityRole="button"
							accessibilityLabel={`${article.titleRu}${isVisited ? ', прочитано' : ''}`}
							onPress={() =>
								navigation.navigate(ROUTES.LearningArticle, {
									articleId: article.id,
								})
							}
							style={({ pressed }) => [
								styles.card,
								!isVisited ? styles.cardUnvisited : null,
								pressed ? styles.cardPressed : null,
							]}
						>
							<View style={styles.cardTop}>
								{article.badgeRu ? (
									<Text style={styles.badge}>{article.badgeRu}</Text>
								) : (
									<Text style={styles.badgeMuted}>Справка</Text>
								)}
								{isVisited ? (
									<Text style={styles.visited}>✓</Text>
								) : (
									<Text style={styles.unvisited}>новое</Text>
								)}
							</View>
							<Text style={styles.title}>{article.titleRu}</Text>
							<Text style={styles.preview} numberOfLines={2}>
								{article.paragraphsRu[0]}
							</Text>
						</Pressable>
					)
				})}
			</ScrollView>
			<BannerAd placement="learning" />
		</Screen>
	)
}

const styles = StyleSheet.create({
	intro: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		marginBottom: theme.spacing.sm,
	},
	progress: {
		...theme.typography.caption,
		color: theme.colors.brandSoft,
		fontWeight: '700',
		marginBottom: theme.spacing.md,
	},
	list: {
		gap: theme.spacing.sm,
		paddingBottom: theme.spacing.xxl,
	},
	card: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		padding: theme.spacing.md,
		minHeight: MIN_TOUCH_TARGET + 20,
		...theme.shadows.card,
	},
	cardUnvisited: {
		borderColor: theme.colors.brandSoft,
		backgroundColor: theme.colors.surfaceElevated,
	},
	cardPressed: {
		backgroundColor: theme.colors.surfaceMuted,
	},
	cardTop: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: theme.spacing.xxs,
	},
	badge: {
		...theme.typography.caption,
		color: theme.colors.accent,
		fontWeight: '700',
	},
	badgeMuted: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		fontWeight: '600',
	},
	visited: {
		...theme.typography.caption,
		color: theme.colors.success,
		fontWeight: '700',
	},
	unvisited: {
		...theme.typography.caption,
		color: theme.colors.brandSoft,
		fontWeight: '700',
	},
	title: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
		marginBottom: theme.spacing.xxs,
	},
	preview: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		lineHeight: 20,
	},
})
