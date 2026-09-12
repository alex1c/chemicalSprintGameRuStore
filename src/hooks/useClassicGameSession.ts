import { useCallback, useEffect, useRef, useState } from 'react'
import {
	advanceAfterFeedback,
	createModeSession,
	createSeededRng,
	expireTimedSessionIfNeeded,
	getCurrentQuestion,
	getLatestAnswer,
	getRemainingSeconds,
	getSessionStats,
	markRewardsCommitted,
	submitCurrentAnswer,
	type GameSession,
} from '../game'
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
	getGameModeConfig,
	isHintAllowed,
	type GameModeId,
} from '../modes'
import {
	commitSessionAtomRewards,
	loadAtomWallet,
	loadElementStats,
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

export interface UseGameSessionResult {
	session: GameSession | null
	weakUnavailable: boolean
	question: ReturnType<typeof getCurrentQuestion>
	stats: ReturnType<typeof getSessionStats> | null
	feedback: ClassicFeedbackView | null
	isAnswerLocked: boolean
	displayQuestionNumber: number
	remainingSeconds: number | null
	atomBalance: number
	hintsOpen: boolean
	setHintsOpen: (open: boolean) => void
	hintBusy: boolean
	insufficientMessage: string | null
	allowedHints: readonly HintType[]
	submitAnswer: (choice: string) => void
	useHint: (type: Exclude<HintType, 'saveStreak'>) => void
	useSaveStreak: () => void
	canAffordHint: (type: HintType) => boolean
	isHintAvailable: (type: HintType) => boolean
	restart: () => void
	completionResult: PersistCompletedSessionResult | null
	modeId: GameModeId
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
			Math.min(session.currentIndex, Math.max(session.questions.length - 1, 0))
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
	const saveAllowed =
		isHintAllowed(session.modeId, 'saveStreak') &&
		!latest.correct &&
		canOfferSaveStreak(session)

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
		saveStreakAvailable: saveAllowed,
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
 * Mode-aware Classic Sprint controller (timer, no-mistake, hints, atoms).
 */
export function useGameSession(
	modeId: GameModeId,
	onSessionComplete?: (result: PersistCompletedSessionResult) => void,
	focusAtomicNumber?: number,
	dailyDateKey?: string,
): UseGameSessionResult {
	const mode = getGameModeConfig(modeId)
	const [session, setSession] = useState<GameSession | null>(null)
	const [weakUnavailable, setWeakUnavailable] = useState(false)
	const [wallet, setWallet] = useState<AtomWalletState | null>(null)
	const [completionResult, setCompletionResult] =
		useState<PersistCompletedSessionResult | null>(null)
	const [hintsOpen, setHintsOpen] = useState(false)
	const [hintBusy, setHintBusy] = useState(false)
	const [insufficientMessage, setInsufficientMessage] = useState<string | null>(
		null,
	)
	const [nowMs, setNowMs] = useState(() => Date.now())

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const mountedRef = useRef(true)
	const completingRef = useRef(false)
	const spendLockRef = useRef(false)
	const sessionRef = useRef<GameSession | null>(null)
	sessionRef.current = session

	const clearAdvanceTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}
	}, [])

	const clearTick = useCallback(() => {
		if (tickRef.current !== null) {
			clearInterval(tickRef.current)
			tickRef.current = null
		}
	}, [])

	const startSession = useCallback(async () => {
		completingRef.current = false
		spendLockRef.current = false
		setHintBusy(false)
		setHintsOpen(false)
		setInsufficientMessage(null)
		setCompletionResult(null)

		const elementStats = await loadElementStats()
		const created = createModeSession(modeId, {
			elementStats,
			focusAtomicNumber,
			dailyDateKey,
		})
		if (!created) {
			setWeakUnavailable(true)
			setSession(null)
			return
		}
		setWeakUnavailable(false)
		setSession(created)
	}, [modeId, focusAtomicNumber, dailyDateKey])

	useEffect(() => {
		mountedRef.current = true
		void loadAtomWallet().then((loaded) => {
			if (mountedRef.current) {
				setWallet(loaded)
			}
		})
		void startSession()
		return () => {
			mountedRef.current = false
			clearAdvanceTimer()
			clearTick()
		}
	}, [startSession, clearAdvanceTimer, clearTick])

	const finishIfNeeded = useCallback(
		async (completedSession: GameSession) => {
			if (!completedSession.isComplete || completingRef.current) {
				return
			}
			completingRef.current = true
			clearTick()
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
							lifetimeEarned: prev.lifetimeEarned + result.atomsEarned,
						}
					: prev,
			)
			setCompletionResult(result)
			onSessionComplete?.(result)
		},
		[clearTick, onSessionComplete],
	)

	// Timed mode ticker based on real deadline timestamps.
	useEffect(() => {
		clearTick()
		if (!session || session.deadlineAt === null || session.isComplete) {
			return
		}
		tickRef.current = setInterval(() => {
			const now = Date.now()
			setNowMs(now)
			setSession((current) => {
				if (!current || current.isComplete) {
					return current
				}
				const expired = expireTimedSessionIfNeeded(current, now)
				if (expired.isComplete && !current.isComplete) {
					clearAdvanceTimer()
					void finishIfNeeded(expired)
				}
				return expired
			})
		}, 250)
		return () => clearTick()
		// session identity fields only — avoid restarting the ticker on every answer.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
	}, [session?.id, session?.deadlineAt, session?.isComplete, clearTick, clearAdvanceTimer, finishIfNeeded])

	const scheduleAdvance = useCallback(
		(nextSession: GameSession, delayMs?: number) => {
			clearAdvanceTimer()
			const latest = getLatestAnswer(nextSession)
			const saveOffered =
				isHintAllowed(nextSession.modeId, 'saveStreak') &&
				Boolean(latest) &&
				!latest!.correct &&
				canOfferSaveStreak(nextSession)
			const timing = getGameModeConfig(nextSession.modeId).feedbackTiming
			const delay =
				delayMs ??
				(latest?.correct
					? timing.correctMs
					: saveOffered
						? Math.max(timing.wrongMs, 2200)
						: timing.wrongMs)

			timerRef.current = setTimeout(() => {
				timerRef.current = null
				if (!mountedRef.current) {
					return
				}
				const now = Date.now()
				setSession((current) => {
					if (!current || current.phase !== 'feedback') {
						return current
					}
					const advanced = advanceAfterFeedback(current, now)
					if (advanced.isComplete) {
						void finishIfNeeded(advanced)
					}
					return advanced
				})
			}, delay)
		},
		[clearAdvanceTimer, finishIfNeeded],
	)

	const submitAnswer = useCallback(
		(choice: string) => {
			setInsufficientMessage(null)
			setSession((current) => {
				if (!current || current.phase !== 'question') {
					return current
				}
				const now = Date.now()
				const next = submitCurrentAnswer(current, choice, undefined, now)
				if (next.isComplete) {
					void finishIfNeeded(next)
					return next
				}
				if (next.phase === 'feedback') {
					scheduleAdvance(next)
					setHintsOpen(false)
				}
				return next
			})
		},
		[finishIfNeeded, scheduleAdvance],
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

	const isHintAvailable = useCallback(
		(type: HintType) => {
			const current = sessionRef.current
			if (!current || !isHintAllowed(current.modeId, type)) {
				return false
			}
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
		},
		[],
	)

	const useHint = useCallback(
		(type: Exclude<HintType, 'saveStreak'>) => {
			if (hintBusy || spendLockRef.current) {
				return
			}
			const current = sessionRef.current
			if (!current || current.phase !== 'question' || !wallet) {
				return
			}
			if (!isHintAllowed(current.modeId, type)) {
				return
			}
			if (!canAfford(wallet, HINT_COSTS[type])) {
				setInsufficientMessage('Недостаточно атомов')
				return
			}

			const applied =
				type === 'fiftyFifty'
					? applyFiftyFifty(current, wallet, createSeededRng(Date.now()))
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

			void persistAtomSpend(applied.cost, HINT_SPEND_REASON[type], type).then(
				(result) => {
					if (!mountedRef.current) {
						return
					}
					if (result.ok) {
						setWallet(result.wallet)
					}
					spendLockRef.current = false
					setHintBusy(false)
				},
			)
		},
		[hintBusy, wallet],
	)

	const useSaveStreak = useCallback(() => {
		if (hintBusy || spendLockRef.current) {
			return
		}
		const current = sessionRef.current
		if (!current || current.phase !== 'feedback' || !wallet) {
			return
		}
		if (!isHintAllowed(current.modeId, 'saveStreak')) {
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
		scheduleAdvance(applied.session, 900)

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
		clearAdvanceTimer()
		clearTick()
		void startSession()
		void loadAtomWallet().then((loaded) => {
			if (mountedRef.current) {
				setWallet(loaded)
			}
		})
	}, [clearAdvanceTimer, clearTick, startSession])

	const question = session ? getCurrentQuestion(session) : null
	const stats = session ? getSessionStats(session) : null
	const feedback = session ? buildFeedback(session) : null
	const answered = session?.answers.length ?? 0
	const displayQuestionNumber = session
		? Math.max(
				Math.min(
					answered + (session.phase === 'feedback' ? 0 : 1),
					Math.max(session.questionCount, answered + 1),
				),
				1,
			)
		: 1

	return {
		session,
		weakUnavailable,
		question,
		stats,
		feedback,
		isAnswerLocked: !session || session.phase !== 'question',
		displayQuestionNumber,
		remainingSeconds: session
			? getRemainingSeconds(session, nowMs)
			: null,
		atomBalance: wallet?.balance ?? 0,
		hintsOpen,
		setHintsOpen,
		hintBusy,
		insufficientMessage,
		allowedHints: mode.allowedHints,
		submitAnswer,
		useHint,
		useSaveStreak,
		canAffordHint,
		isHintAvailable,
		restart,
		completionResult,
		modeId,
	}
}

/** Backward-compatible alias for Classic Sprint. */
export function useClassicGameSession(
	onSessionComplete?: (result: PersistCompletedSessionResult) => void,
): UseGameSessionResult {
	return useGameSession('CLASSIC', onSessionComplete)
}
