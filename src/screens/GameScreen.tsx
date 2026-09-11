import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import {
	answerCurrentQuestion,
	createGameSession,
	getCurrentQuestion,
	getSessionStats,
	type GameSession,
} from '../game'
import { theme } from '../theme'

/**
 * Minimal Game screen wired to the pure engine for foundation smoke paths.
 * Full quiz UI polish comes in later phases.
 */
export function GameScreen() {
	const [session, setSession] = useState<GameSession>(() => createGameSession())
	const question = getCurrentQuestion(session)
	const stats = useMemo(() => getSessionStats(session), [session])

	const handleAnswer = (choice: string) => {
		setSession((prev) => answerCurrentQuestion(prev, choice))
	}

	const handleRestart = () => {
		setSession(createGameSession())
	}

	if (session.isComplete || !question) {
		return (
			<Screen title="Результат" subtitle="Сессия из 10 вопросов завершена">
				<Text style={styles.stat}>Счёт: {stats.score}</Text>
				<Text style={styles.stat}>
					Верно: {stats.correctCount}/{stats.answeredCount}
				</Text>
				<Text style={styles.stat}>
					Точность: {Math.round(stats.accuracy * 100)}%
				</Text>
				<Text style={styles.stat}>Лучшая серия: {stats.bestStreak}</Text>
				<View style={styles.footer}>
					<PrimaryButton label="Ещё раз" onPress={handleRestart} />
				</View>
			</Screen>
		)
	}

	return (
		<Screen
			title="Игра"
			subtitle={`Вопрос ${session.currentIndex + 1} из ${session.questionCount}`}
		>
			<Text style={styles.prompt}>{question.prompt}</Text>
			<View style={styles.choices}>
				{question.choices.map((choice) => (
					<PrimaryButton
						key={choice}
						label={choice}
						onPress={() => handleAnswer(choice)}
					/>
				))}
			</View>
			<Text style={styles.meta}>
				Серия: {stats.currentStreak} · Счёт: {stats.score}
			</Text>
		</Screen>
	)
}

const styles = StyleSheet.create({
	prompt: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
		marginBottom: theme.spacing.lg,
	},
	choices: {
		gap: theme.spacing.sm,
	},
	meta: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.lg,
	},
	stat: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		marginBottom: theme.spacing.xs,
	},
	footer: {
		marginTop: theme.spacing.xl,
	},
})
