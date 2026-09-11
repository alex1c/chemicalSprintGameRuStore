import { useCallback } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
	AnswerButton,
	AnswerFeedback,
	GameHud,
	GameProgress,
	QuestionCard,
	type AnswerButtonState,
} from '../components/game'
import { Screen } from '../components/Screen'
import { useClassicGameSession } from '../hooks/useClassicGameSession'
import { ROUTES } from '../constants/routes'
import type { RootStackParamList } from '../navigation/types'
import type { PersistCompletedSessionResult } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>

/**
 * Remounts ClassicGamePlay when sessionKey changes so restart is a fresh session.
 */
export function GameScreen({ navigation, route }: Props) {
	const sessionKey = route.params?.sessionKey ?? 0
	return (
		<ClassicGamePlay
			key={sessionKey}
			navigation={navigation}
		/>
	)
}

function ClassicGamePlay({
	navigation,
}: {
	navigation: Props['navigation']
}) {
	const handleComplete = useCallback(
		(result: PersistCompletedSessionResult) => {
			navigation.replace(ROUTES.Result, {
				score: result.summary.score,
				correctCount: result.summary.correctCount,
				wrongCount: result.summary.wrongCount,
				questionCount: result.summary.questionCount,
				accuracy: result.summary.accuracy,
				bestStreak: result.summary.bestStreak,
				previousBestScore: result.previousBestScore,
				isNewBestScore: result.isNewBestScore,
				persisted: result.persisted,
			})
		},
		[navigation],
	)

	const {
		session,
		question,
		stats,
		feedback,
		isAnswerLocked,
		displayQuestionNumber,
		submitAnswer,
	} = useClassicGameSession(handleComplete)

	const progressCurrent =
		session.phase === 'feedback'
			? session.answers.length
			: Math.min(session.answers.length, session.questionCount)

	return (
		<Screen edges={['top', 'left', 'right', 'bottom']}>
			<GameHud
				questionNumber={displayQuestionNumber}
				questionCount={session.questionCount}
				streak={stats.currentStreak}
				score={stats.score}
				scoreDelta={
					session.phase === 'feedback' ? session.lastPointsEarned : 0
				}
			/>
			<View style={styles.progressWrap}>
				<GameProgress
					current={progressCurrent}
					total={session.questionCount}
				/>
			</View>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{question ? (
					<>
						<QuestionCard
							prompt={question.prompt}
							typeLabel={question.metadata.typeLabelRu}
						/>

						<View style={styles.choices}>
							{question.choices.map((choice) => {
								let state: AnswerButtonState = 'idle'
								if (feedback) {
									if (choice === feedback.correctAnswer) {
										state = 'correct'
									} else if (
										choice === feedback.selectedAnswer &&
										!feedback.correct
									) {
										state = 'wrong'
									} else {
										state = 'disabled'
									}
								}

								return (
									<AnswerButton
										key={`${question.id}-${choice}`}
										label={choice}
										state={state}
										onPress={() => {
											if (!isAnswerLocked) {
												submitAnswer(choice)
											}
										}}
									/>
								)
							})}
						</View>

						{feedback ? (
							<View style={styles.feedback}>
								<AnswerFeedback
									correct={feedback.correct}
									title={feedback.title}
									detailLine={feedback.detailLine}
									explanation={feedback.explanation}
								/>
							</View>
						) : null}
					</>
				) : null}
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	progressWrap: {
		marginTop: theme.spacing.sm,
		marginBottom: theme.spacing.md,
	},
	scrollContent: {
		paddingBottom: theme.spacing.lg,
		gap: theme.spacing.md,
	},
	choices: {
		gap: theme.spacing.sm,
	},
	feedback: {
		marginTop: theme.spacing.xs,
	},
})
