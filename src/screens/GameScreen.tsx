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
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { useGameSession } from '../hooks/useClassicGameSession'
import { ROUTES } from '../constants/routes'
import { getGameModeConfig, type GameModeId } from '../modes'
import type { RootStackParamList } from '../navigation/types'
import type { PersistCompletedSessionResult } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>

/**
 * Remounts play surface when sessionKey/mode changes.
 */
export function GameScreen({ navigation, route }: Props) {
	const sessionKey = route.params?.sessionKey ?? 0
	const modeId = route.params?.modeId ?? 'CLASSIC'
	const focusAtomicNumber = route.params?.focusAtomicNumber
	const dailyDateKey = route.params?.dailyDateKey
	return (
		<ModeGamePlay
			key={`${modeId}-${focusAtomicNumber ?? 'any'}-${dailyDateKey ?? 'nodate'}-${sessionKey}`}
			navigation={navigation}
			modeId={modeId}
			focusAtomicNumber={focusAtomicNumber}
			dailyDateKey={dailyDateKey}
		/>
	)
}

function ModeGamePlay({
	navigation,
	modeId,
	focusAtomicNumber,
	dailyDateKey,
}: {
	navigation: Props['navigation']
	modeId: GameModeId
	focusAtomicNumber?: number
	dailyDateKey?: string
}) {
	const mode = getGameModeConfig(modeId)

	const handleComplete = useCallback(
		(result: PersistCompletedSessionResult) => {
			navigation.replace(ROUTES.Result, {
				modeId: result.modeId,
				score: result.summary.score,
				correctCount: result.summary.correctCount,
				wrongCount: result.summary.wrongCount,
				questionCount: result.summary.questionCount,
				accuracy: result.summary.accuracy,
				bestStreak: result.summary.bestStreak,
				previousBestScore: result.previousBestScore,
				isNewBestScore: result.isNewBestScore,
				isNewModeRecord: result.isNewModeRecord,
				persisted: result.persisted,
				atomsEarned: result.atomsEarned,
				atomBalance: result.atomBalance,
				rewardBreakdown: result.rewardBreakdown,
				endReason: result.endReason,
				focusAtomicNumber,
				dailyDateKey: result.dailyDateKey ?? dailyDateKey,
				isDailyFirstCompletion: result.isDailyFirstCompletion,
				dailyBonusGranted: result.dailyBonusGranted,
				dailyCurrentStreak: result.dailyCurrentStreak,
				dailyStreakGrew: result.dailyStreakGrew,
				dailyNewStreakStarted: result.dailyNewStreakStarted,
				isDailyReplay: result.isDailyReplay,
				newlyUnlockedAchievementIds: result.newlyUnlockedAchievementIds,
			})
		},
		[navigation, focusAtomicNumber, dailyDateKey],
	)

	const {
		session,
		weakUnavailable,
		question,
		stats,
		feedback,
		isAnswerLocked,
		displayQuestionNumber,
		remainingSeconds,
		atomBalance,
		hintsOpen,
		setHintsOpen,
		hintBusy,
		insufficientMessage,
		allowedHints,
		submitAnswer,
		useHint,
		useSaveStreak,
		canAffordHint,
		isHintAvailable,
	} = useGameSession(modeId, handleComplete, focusAtomicNumber, dailyDateKey)

	if (weakUnavailable) {
		return (
			<Screen title="Слабые элементы" edges={['top', 'left', 'right', 'bottom']}>
				<Text style={styles.weakTitle}>Пока мало данных</Text>
				<Text style={styles.weakBody}>
					Сыграй несколько обычных спринтов — мы найдём элементы, которые
					стоит повторить.
				</Text>
				<PrimaryButton
					label="Играть классический"
					onPress={() =>
						navigation.replace(ROUTES.Game, {
							modeId: 'CLASSIC',
							sessionKey: Date.now(),
						})
					}
				/>
			</Screen>
		)
	}

	if (!session || !stats) {
		return (
			<Screen edges={['top', 'left', 'right', 'bottom']}>
				<Text style={styles.weakBody}>Загрузка…</Text>
			</Screen>
		)
	}

	const hintState = session.extensions.hintState
	const showFixedProgress = mode.endCondition === 'fixed_count'
	const progressCurrent =
		session.phase === 'feedback'
			? session.answers.length
			: Math.min(session.answers.length, session.questionCount)

	return (
		<Screen edges={['top', 'left', 'right', 'bottom']}>
			<View style={styles.topRow}>
				{mode.endCondition === 'timed' ? (
					<View style={styles.timedHud}>
						<Text
							accessibilityRole="text"
							accessibilityLabel={`Осталось ${remainingSeconds ?? 0} секунд`}
							style={styles.timer}
						>
							⏱ {remainingSeconds ?? 0} сек
						</Text>
						<Text style={styles.answered}>
							Отвечено: {stats.answeredCount}
						</Text>
						<Text style={styles.streak}>🔥 {stats.currentStreak}</Text>
						<Text style={styles.score}>Очки: {stats.score}</Text>
					</View>
				) : mode.endCondition === 'until_mistake' ? (
					<View style={styles.timedHud}>
						<Text style={styles.noMistakeLabel}>До первой ошибки</Text>
						<Text style={styles.streak}>🔥 {stats.currentStreak}</Text>
						<Text style={styles.answered}>
							Верно: {stats.correctCount}
						</Text>
						<Text style={styles.score}>Очки: {stats.score}</Text>
					</View>
				) : (
					<GameHud
						questionNumber={displayQuestionNumber}
						questionCount={session.questionCount}
						streak={stats.currentStreak}
						score={stats.score}
						scoreDelta={
							session.phase === 'feedback' ? session.lastPointsEarned : 0
						}
					/>
				)}
				<AtomBalanceChip balance={atomBalance} compact />
			</View>

			{showFixedProgress ? (
				<View style={styles.progressWrap}>
					<GameProgress
						current={progressCurrent}
						total={session.questionCount}
					/>
				</View>
			) : (
				<View style={styles.progressWrap} />
			)}

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
								<Text style={styles.factText}>{hintState.factText}</Text>
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
								} else if (hintState.eliminatedChoices.includes(choice)) {
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
								allowedHints={allowedHints}
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
									saveStreakAvailable={feedback.saveStreakAvailable}
									saveStreakUsed={feedback.saveStreakUsed}
									streakBeforeWrong={feedback.streakBeforeWrong}
									canAffordSaveStreak={canAffordHint('saveStreak')}
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
	timedHud: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: theme.spacing.sm,
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	timer: {
		...theme.typography.subtitle,
		color: theme.colors.accent,
	},
	answered: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		fontWeight: '600',
	},
	streak: {
		...theme.typography.body,
		color: theme.colors.accent,
		fontWeight: '700',
	},
	score: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
		fontWeight: '600',
	},
	noMistakeLabel: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		width: '100%',
	},
	weakTitle: {
		...theme.typography.title,
		color: theme.colors.brand,
		marginBottom: theme.spacing.sm,
	},
	weakBody: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		marginBottom: theme.spacing.lg,
	},
})
