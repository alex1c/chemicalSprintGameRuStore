import { useCallback, useEffect, useRef, useState } from 'react'
import {
	advanceAfterFeedback,
	createClassicSprintSession,
	getCurrentQuestion,
	getLatestAnswer,
	getSessionStats,
	submitCurrentAnswer,
	type GameSession,
} from '../game'
import { GAMEPLAY_TIMING } from '../constants/gameplay'
import {
	persistCompletedSessionStats,
	type PersistCompletedSessionResult,
} from '../stats'
import { getElementByAtomicNumber } from '../data/chemistry'

export interface ClassicFeedbackView {
	correct: boolean
	selectedAnswer: string
	correctAnswer: string
	title: string
	detailLine: string
	explanation: string
	pointsEarned: number
}

export interface UseClassicGameSessionResult {
	session: GameSession
	question: ReturnType<typeof getCurrentQuestion>
	stats: ReturnType<typeof getSessionStats>
	feedback: ClassicFeedbackView | null
	isAnswerLocked: boolean
	/** Displayed question number (1-based), frozen during feedback. */
	displayQuestionNumber: number
	submitAnswer: (choice: string) => void
	restart: () => void
	completionResult: PersistCompletedSessionResult | null
}

function buildFeedback(session: GameSession): ClassicFeedbackView | null {
	const showFeedback =
		session.phase === 'feedback' ||
		(session.isComplete && session.answers.length > 0)
	if (!showFeedback) {
		return null
	}
	const latest = getLatestAnswer(session)
	const question =
		session.questions[
			Math.min(session.currentIndex, session.questionCount - 1)
		]
	if (!latest || !question) {
		return null
	}

	const element =
		getElementByAtomicNumber(latest.elementAtomicNumber) ??
		getElementByAtomicNumber(question.elementAtomicNumber)

	const detailLine = element
		? `${element.symbol} — ${element.nameRu} · №${element.atomicNumber}`
		: `${latest.correctAnswer}`

	return {
		correct: latest.correct,
		selectedAnswer: latest.selectedAnswer,
		correctAnswer: latest.correctAnswer,
		title: latest.correct ? 'Верно!' : 'Неверно',
		detailLine,
		explanation: question.explanation,
		pointsEarned: latest.pointsEarned,
	}
}

/**
 * Classic Sprint controller: engine session + answer lock + auto-next timers.
 */
export function useClassicGameSession(
	onSessionComplete?: (result: PersistCompletedSessionResult) => void,
): UseClassicGameSessionResult {
	const [session, setSession] = useState<GameSession>(() =>
		createClassicSprintSession(),
	)
	const [completionResult, setCompletionResult] =
		useState<PersistCompletedSessionResult | null>(null)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const mountedRef = useRef(true)
	const completingRef = useRef(false)

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}
	}, [])

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
			clearTimer()
		}
	}, [clearTimer])

	const finishIfNeeded = useCallback(
		async (completedSession: GameSession) => {
			if (!completedSession.isComplete || completingRef.current) {
				return
			}
			completingRef.current = true
			const result = await persistCompletedSessionStats(completedSession)
			if (!mountedRef.current) {
				return
			}
			setCompletionResult(result)
			onSessionComplete?.(result)
		},
		[onSessionComplete],
	)

	const scheduleAdvance = useCallback(
		(nextSession: GameSession) => {
			clearTimer()
			const latest = getLatestAnswer(nextSession)
			const delay = latest?.correct
				? GAMEPLAY_TIMING.correctFeedbackMs
				: GAMEPLAY_TIMING.wrongFeedbackMs

			timerRef.current = setTimeout(() => {
				timerRef.current = null
				if (!mountedRef.current) {
					return
				}
				setSession((current) => {
					if (current.phase !== 'feedback') {
						return current
					}
					const advanced = advanceAfterFeedback(current)
					if (advanced.isComplete) {
						void finishIfNeeded(advanced)
					}
					return advanced
				})
			}, delay)
		},
		[clearTimer, finishIfNeeded],
	)

	const submitAnswer = useCallback(
		(choice: string) => {
			setSession((current) => {
				if (current.phase !== 'question') {
					return current
				}
				const next = submitCurrentAnswer(current, choice)
				if (next.phase === 'feedback') {
					scheduleAdvance(next)
				}
				return next
			})
		},
		[scheduleAdvance],
	)

	const restart = useCallback(() => {
		clearTimer()
		completingRef.current = false
		setCompletionResult(null)
		setSession(createClassicSprintSession())
	}, [clearTimer])

	const question = getCurrentQuestion(session)
	const stats = getSessionStats(session)
	const feedback = buildFeedback(session)
	const displayQuestionNumber = Math.min(
		session.answers.length + (session.phase === 'feedback' ? 0 : 1),
		session.questionCount,
	)

	return {
		session,
		question,
		stats,
		feedback,
		isAnswerLocked: session.phase !== 'question',
		displayQuestionNumber: Math.max(displayQuestionNumber, 1),
		submitAnswer,
		restart,
		completionResult,
	}
}
