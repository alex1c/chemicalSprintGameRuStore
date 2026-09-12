import { useEffect } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Screen } from '../components/Screen'
import { getLearningArticle } from '../learning'
import type { RootStackParamList } from '../navigation/types'
import { markLearningArticleVisited } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'LearningArticle'>

/**
 * Single learning article with short paragraphs and an example.
 */
export function LearningArticleScreen({ route, navigation }: Props) {
	const article = getLearningArticle(route.params.articleId)

	useEffect(() => {
		if (!article) {
			return
		}
		navigation.setOptions({ title: article.titleRu })
		void markLearningArticleVisited(article.id)
	}, [article, navigation])

	if (!article) {
		return (
			<Screen>
				<Text style={styles.body}>Статья не найдена.</Text>
			</Screen>
		)
	}

	return (
		<Screen edges={['left', 'right', 'bottom']}>
			<ScrollView contentContainerStyle={styles.content}>
				{article.badgeRu ? (
					<Text style={styles.badge}>{article.badgeRu}</Text>
				) : null}
				<Text style={styles.title}>{article.titleRu}</Text>
				{article.paragraphsRu.map((paragraph) => (
					<Text key={paragraph} style={styles.body}>
						{paragraph}
					</Text>
				))}
				{article.exampleRu ? (
					<View style={styles.example}>
						<Text style={styles.exampleLabel}>Пример</Text>
						<Text style={styles.exampleText}>{article.exampleRu}</Text>
					</View>
				) : null}
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: theme.spacing.xxl,
		gap: theme.spacing.sm,
	},
	badge: {
		...theme.typography.caption,
		color: theme.colors.accent,
		fontWeight: '700',
	},
	title: {
		...theme.typography.title,
		color: theme.colors.brand,
		marginBottom: theme.spacing.sm,
	},
	body: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		lineHeight: 26,
		marginBottom: theme.spacing.xs,
	},
	example: {
		marginTop: theme.spacing.md,
		backgroundColor: theme.colors.surfaceElevated,
		borderRadius: theme.radius.lg,
		padding: theme.spacing.md,
		borderWidth: 1,
		borderColor: theme.colors.info,
		gap: theme.spacing.xs,
	},
	exampleLabel: {
		...theme.typography.caption,
		color: theme.colors.info,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	exampleText: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		lineHeight: 24,
	},
})
