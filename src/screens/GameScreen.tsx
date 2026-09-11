import { useCallback } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
	AnswerButton,
	AnswerFeedback,
	AtomBalanceChip,
	GameHud,
	GameProgress,
	HintPanel,
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
	return <ClassicGamePlay key={sessionKey} navigation={navigation} />
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
				atomsEarned: result.atomsEarned,
				atomBalance: result.atomBalance,
				rewardBreakdown: result.rewardBreakdown,
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
		atomBalance,
		hintsOpen,
		setHintsOpen,
		hintBusy,
		insufficientMessage,
		submitAnswer,
		useHint,
		useSaveStreak,
		canAffordHint,
		isHintAvailable,
	} = useClassicGameSession(handleComplete)

	const hintState = session.extensions.hintState
	const progressCurrent =
		session.phase === 'feedback'
			? session.answers.length
			: Math.min(session.answers.length, session.questionCount)

	return (
		<Screen edges={['top', 'left', 'right', 'bottom']}>
			<View style={styles.topRow}>
				<GameHud
					questionNumber={displayQuestionNumber}
					questionCount={session.questionCount}
					streak={stats.currentStreak}
					score={stats.score}
					scoreDelta={
						session.phase === 'feedback'
							? session.lastPointsEarned
							: 0
					}
				/>
				<AtomBalanceChip balance={atomBalance} compact />
			</View>
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

						{hintState.factText ? (
							<View style={styles.factCard}>
								<Text style={styles.factTitle}>💡 Подсказка</Text>
								<Text style={styles.factText}>
									{hintState.factText}
								</Text>
							</View>
						) : null}

						{hintState.awaitingSecondAttempt ? (
							<AnswerFeedback
								correct={false}
								title="Попробуй ещё раз"
								detailLine=""
								explanation=""
								awaitingSecondAttempt
							/>
						) : null}

						<View style={styles.choices}>
							{question.choices.map((choice, index) => {
								let state: AnswerButtonState = 'idle'
								if (hintState.hiddenChoiceIndexes.includes(index)) {
									state = 'hidden'
								} else if (
									hintState.eliminatedChoices.includes(choice)
								) {
									state = 'wrong'
								} else if (feedback) {
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

						{!isAnswerLocked ? (
							<HintPanel
								open={hintsOpen}
								onToggle={() => setHintsOpen(!hintsOpen)}
								disabled={hintBusy}
								atomBalance={atomBalance}
								canAffordHint={canAffordHint}
								isHintAvailable={isHintAvailable}
								onUseHint={useHint}
								insufficientMessage={insufficientMessage}
								secondChanceActive={
									hintState.secondChanceActivated &&
									!hintState.secondChanceConsumed
								}
							/>
						) : null}

						{feedback ? (
							<View style={styles.feedback}>
								<AnswerFeedback
									correct={feedback.correct}
									title={feedback.title}
									detailLine={feedback.detailLine}
									explanation={feedback.explanation}
									saveStreakAvailable={
										feedback.saveStreakAvailable
									}
									saveStreakUsed={feedback.saveStreakUsed}
									streakBeforeWrong={feedback.streakBeforeWrong}
									canAffordSaveStreak={canAffordHint(
										'saveStreak',
									)}
									onSaveStreak={useSaveStreak}
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
	topRow: {
		gap: theme.spacing.sm,
	},
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
	factCard: {
		backgroundColor: theme.colors.accentSoft,
		borderRadius: theme.radius.md,
		padding: theme.spacing.md,
		borderWidth: 1,
		borderColor: theme.colors.accent,
	},
	factTitle: {
		...theme.typography.subtitle,
		fontSize: 15,
		color: theme.colors.accent,
		marginBottom: theme.spacing.xxs,
	},
	factText: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
	},
})
