import { useCallback, useEffect, useRef, useState } from 'react'
import {
	advanceAfterFeedback,
	createClassicSprintSession,
	createSeededRng,
	getCurrentQuestion,
	getLatestAnswer,
	getSessionStats,
	markRewardsCommitted,
	submitCurrentAnswer,
	type GameSession,
} from '../game'
import { GAMEPLAY_TIMING } from '../constants/gameplay'
import { getElementByAtomicNumber } from '../data/chemistry'
import {
	activateSecondChance,
	applyFactHint,
	applyFiftyFifty,
	applySaveStreak,
	canAfford,
	canOfferSaveStreak,
	canUseFact,
	canUseFiftyFifty,
	canUseSecondChance,
	HINT_COSTS,
	type AtomWalletState,
	type HintType,
} from '../economy'
import {
	commitSessionAtomRewards,
	loadAtomWallet,
	persistAtomSpend,
	persistCompletedSessionStats,
	type PersistCompletedSessionResult,
} from '../stats'

export interface ClassicFeedbackView {
	correct: boolean
	selectedAnswer: string
	correctAnswer: string
	title: string
	detailLine: string
	explanation: string
	pointsEarned: number
	saveStreakAvailable: boolean
	saveStreakUsed: boolean
	streakBeforeWrong: number
}

export interface UseClassicGameSessionResult {
	session: GameSession
	question: ReturnType<typeof getCurrentQuestion>
	stats: ReturnType<typeof getSessionStats>
	feedback: ClassicFeedbackView | null
	isAnswerLocked: boolean
	displayQuestionNumber: number
	atomBalance: number
	hintsOpen: boolean
	setHintsOpen: (open: boolean) => void
	hintBusy: boolean
	insufficientMessage: string | null
	submitAnswer: (choice: string) => void
	useHint: (type: Exclude<HintType, 'saveStreak'>) => void
	useSaveStreak: () => void
	canAffordHint: (type: HintType) => boolean
	isHintAvailable: (type: HintType) => boolean
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

	const streakBefore = session.extensions.hintState.streakBeforeWrong ?? 0

	return {
		correct: latest.correct,
		selectedAnswer: latest.selectedAnswer,
		correctAnswer: latest.correctAnswer,
		title: latest.correct
			? 'Верно!'
			: session.extensions.hintState.saveStreakUsed
				? '🔥 Серия сохранена'
				: 'Неверно',
		detailLine,
		explanation: question.explanation,
		pointsEarned: latest.pointsEarned,
		saveStreakAvailable: !latest.correct && canOfferSaveStreak(session),
		saveStreakUsed: session.extensions.hintState.saveStreakUsed,
		streakBeforeWrong: streakBefore,
	}
}

const HINT_SPEND_REASON: Record<
	HintType,
	| 'hint_fifty_fifty'
	| 'hint_fact'
	| 'hint_second_chance'
	| 'hint_save_streak'
> = {
	fiftyFifty: 'hint_fifty_fifty',
	fact: 'hint_fact',
	secondChance: 'hint_second_chance',
	saveStreak: 'hint_save_streak',
}

/**
 * Classic Sprint controller: engine session + hints + atom wallet + timers.
 */
export function useClassicGameSession(
	onSessionComplete?: (result: PersistCompletedSessionResult) => void,
): UseClassicGameSessionResult {
	const [session, setSession] = useState<GameSession>(() =>
		createClassicSprintSession(),
	)
	const [wallet, setWallet] = useState<AtomWalletState | null>(null)
	const [completionResult, setCompletionResult] =
		useState<PersistCompletedSessionResult | null>(null)
	const [hintsOpen, setHintsOpen] = useState(false)
	const [hintBusy, setHintBusy] = useState(false)
	const [insufficientMessage, setInsufficientMessage] = useState<
		string | null
	>(null)

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const mountedRef = useRef(true)
	const completingRef = useRef(false)
	const spendLockRef = useRef(false)
	const sessionRef = useRef(session)
	sessionRef.current = session

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}
	}, [])

	useEffect(() => {
		mountedRef.current = true
		void loadAtomWallet().then((loaded) => {
			if (mountedRef.current) {
				setWallet(loaded)
			}
		})
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
			const marked = commitSessionAtomRewards(
				completedSession,
				result.atomsEarned,
			)
			setSession(markRewardsCommitted(marked, result.atomsEarned))
			setWallet((prev) =>
				prev
					? {
							...prev,
							balance: result.atomBalance,
							lifetimeEarned:
								prev.lifetimeEarned + result.atomsEarned,
						}
					: prev,
			)
			setCompletionResult(result)
			onSessionComplete?.(result)
		},
		[onSessionComplete],
	)

	const scheduleAdvance = useCallback(
		(nextSession: GameSession, delayMs?: number) => {
			clearTimer()
			const latest = getLatestAnswer(nextSession)
			const saveOffered =
				Boolean(latest) &&
				!latest!.correct &&
				canOfferSaveStreak(nextSession)
			const delay =
				delayMs ??
				(latest?.correct
					? GAMEPLAY_TIMING.correctFeedbackMs
					: saveOffered
						? GAMEPLAY_TIMING.wrongFeedbackWithSaveStreakMs
						: GAMEPLAY_TIMING.wrongFeedbackMs)

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
			setInsufficientMessage(null)
			setSession((current) => {
				if (current.phase !== 'question') {
					return current
				}
				const next = submitCurrentAnswer(current, choice)
				if (next.phase === 'feedback') {
					scheduleAdvance(next)
					setHintsOpen(false)
				}
				return next
			})
		},
		[scheduleAdvance],
	)

	const canAffordHint = useCallback(
		(type: HintType) => {
			if (!wallet) {
				return false
			}
			return canAfford(wallet, HINT_COSTS[type])
		},
		[wallet],
	)

	const isHintAvailable = useCallback((type: HintType) => {
		const current = sessionRef.current
		switch (type) {
			case 'fiftyFifty':
				return canUseFiftyFifty(current)
			case 'fact':
				return canUseFact(current)
			case 'secondChance':
				return canUseSecondChance(current)
			case 'saveStreak':
				return canOfferSaveStreak(current)
			default:
				return false
		}
	}, [])

	const useHint = useCallback(
		(type: Exclude<HintType, 'saveStreak'>) => {
			if (hintBusy || spendLockRef.current) {
				return
			}
			const current = sessionRef.current
			if (current.phase !== 'question' || !wallet) {
				return
			}
			if (!canAfford(wallet, HINT_COSTS[type])) {
				setInsufficientMessage('Недостаточно атомов')
				return
			}

			const applied =
				type === 'fiftyFifty'
					? applyFiftyFifty(
							current,
							wallet,
							createSeededRng(Date.now()),
						)
					: type === 'fact'
						? applyFactHint(current, wallet)
						: activateSecondChance(current, wallet)

			if (!applied.ok) {
				if (applied.error === 'insufficient_balance') {
					setInsufficientMessage('Недостаточно атомов')
				}
				return
			}

			spendLockRef.current = true
			setHintBusy(true)
			setSession(applied.session)
			setInsufficientMessage(null)

			void persistAtomSpend(
				applied.cost,
				HINT_SPEND_REASON[type],
				type,
			).then((result) => {
				if (!mountedRef.current) {
					return
				}
				if (result.ok) {
					setWallet(result.wallet)
				}
				spendLockRef.current = false
				setHintBusy(false)
			})
		},
		[hintBusy, wallet],
	)

	const useSaveStreak = useCallback(() => {
		if (hintBusy || spendLockRef.current) {
			return
		}
		const current = sessionRef.current
		if (current.phase !== 'feedback' || !wallet) {
			return
		}
		if (!canAfford(wallet, HINT_COSTS.saveStreak)) {
			setInsufficientMessage('Недостаточно атомов')
			return
		}

		const applied = applySaveStreak(current, wallet)
		if (!applied.ok) {
			if (applied.error === 'insufficient_balance') {
				setInsufficientMessage('Недостаточно атомов')
			}
			return
		}

		spendLockRef.current = true
		setHintBusy(true)
		setSession(applied.session)
		setInsufficientMessage(null)
		scheduleAdvance(applied.session, GAMEPLAY_TIMING.saveStreakConfirmMs)

		void persistAtomSpend(
			applied.cost,
			HINT_SPEND_REASON.saveStreak,
			'saveStreak',
		).then((result) => {
			if (!mountedRef.current) {
				return
			}
			if (result.ok) {
				setWallet(result.wallet)
			}
			spendLockRef.current = false
			setHintBusy(false)
		})
	}, [hintBusy, scheduleAdvance, wallet])

	const restart = useCallback(() => {
		clearTimer()
		completingRef.current = false
		spendLockRef.current = false
		setHintBusy(false)
		setHintsOpen(false)
		setInsufficientMessage(null)
		setCompletionResult(null)
		setSession(createClassicSprintSession())
		void loadAtomWallet().then((loaded) => {
			if (mountedRef.current) {
				setWallet(loaded)
			}
		})
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
		atomBalance: wallet?.balance ?? 0,
		hintsOpen,
		setHintsOpen,
		hintBusy,
		insufficientMessage,
		submitAnswer,
		useHint,
		useSaveStreak,
		canAffordHint,
		isHintAvailable,
		restart,
		completionResult,
	}
}
