import { getElementByAtomicNumber } from '../data/chemistry'
import { getSafeFactHint } from '../economy/factHints'
import { HINT_COSTS, type HintType } from '../economy/config'
import { canAfford, type AtomWalletState } from '../economy/wallet'
import { createSeededRng, type Rng } from '../game/rng'
import {
	createInitialHintState,
	type GameSession,
	type SessionHintState,
} from '../game/types'

export type HintApplyError =
	| 'insufficient_balance'
	| 'not_available'
	| 'already_used'
	| 'wrong_phase'
	| 'invalid_question'

export interface HintApplySuccess {
	ok: true
	session: GameSession
	cost: number
	hintType: HintType
}

export interface HintApplyFailure {
	ok: false
	session: GameSession
	error: HintApplyError
}

export type HintApplyResult = HintApplySuccess | HintApplyFailure

function withHintState(
	session: GameSession,
	hintState: SessionHintState,
	extra?: Partial<GameSession['extensions']>,
): GameSession {
	return {
		...session,
		extensions: {
			...session.extensions,
			...extra,
			hintState,
		},
	}
}

function currentQuestion(session: GameSession) {
	return session.questions[session.currentIndex] ?? null
}

/**
 * Compute 50/50 hidden wrong-choice indexes.
 * 4-choice → hide 2 wrong; 3-choice → hide 1 wrong. Correct never hidden.
 */
export function pickFiftyFiftyHiddenIndexes(
	choices: readonly string[],
	correctAnswer: string,
	rng: Rng,
): number[] {
	const wrongIndexes = choices
		.map((choice, index) => ({ choice, index }))
		.filter((entry) => entry.choice !== correctAnswer)
		.map((entry) => entry.index)

	const hideCount = choices.length >= 4 ? 2 : 1
	const target = Math.min(hideCount, wrongIndexes.length)
	const pool = [...wrongIndexes]
	const selected: number[] = []

	for (let i = 0; i < target; i += 1) {
		const pick = Math.floor(rng() * pool.length)
		const index = pool.splice(pick, 1)[0]
		if (typeof index === 'number') {
			selected.push(index)
		}
	}

	return selected.sort((a, b) => a - b)
}

export function canUseFiftyFifty(session: GameSession): boolean {
	if (session.phase !== 'question') {
		return false
	}
	const hint = session.extensions.hintState
	if (hint.fiftyFiftyUsed) {
		return false
	}
	const question = currentQuestion(session)
	return Boolean(question && question.choices.length >= 3)
}

export function canUseFact(session: GameSession): boolean {
	if (session.phase !== 'question') {
		return false
	}
	return !session.extensions.hintState.factUsed
}

export function canUseSecondChance(session: GameSession): boolean {
	if (session.phase !== 'question') {
		return false
	}
	const hint = session.extensions.hintState
	return !hint.secondChanceActivated && !hint.secondChanceConsumed
}

/**
 * Save Streak is only offered during feedback after a wrong answer with prior streak.
 */
export function canOfferSaveStreak(session: GameSession): boolean {
	if (session.phase !== 'feedback') {
		return false
	}
	const hint = session.extensions.hintState
	if (hint.saveStreakUsed) {
		return false
	}
	const streakBefore = hint.streakBeforeWrong
	return typeof streakBefore === 'number' && streakBefore > 0
}

export function applyFiftyFifty(
	session: GameSession,
	wallet: AtomWalletState,
	rng: Rng = createSeededRng(Date.now()),
): HintApplyResult {
	if (!canUseFiftyFifty(session)) {
		return {
			ok: false,
			session,
			error: session.extensions.hintState.fiftyFiftyUsed
				? 'already_used'
				: 'not_available',
		}
	}
	const cost = HINT_COSTS.fiftyFifty
	if (!canAfford(wallet, cost)) {
		return { ok: false, session, error: 'insufficient_balance' }
	}

	const question = currentQuestion(session)
	if (!question) {
		return { ok: false, session, error: 'invalid_question' }
	}

	const hiddenChoiceIndexes = pickFiftyFiftyHiddenIndexes(
		question.choices,
		question.correctAnswer,
		rng,
	)

	const hintState: SessionHintState = {
		...session.extensions.hintState,
		fiftyFiftyUsed: true,
		hiddenChoiceIndexes,
	}

	return {
		ok: true,
		cost,
		hintType: 'fiftyFifty',
		session: withHintState(session, hintState, {
			atomsSpent: session.extensions.atomsSpent + cost,
			hintsUsed: session.extensions.hintsUsed + 1,
			hintUsage: {
				...session.extensions.hintUsage,
				fiftyFifty: session.extensions.hintUsage.fiftyFifty + 1,
			},
		}),
	}
}

export function applyFactHint(
	session: GameSession,
	wallet: AtomWalletState,
): HintApplyResult {
	if (!canUseFact(session)) {
		return {
			ok: false,
			session,
			error: session.extensions.hintState.factUsed
				? 'already_used'
				: 'not_available',
		}
	}
	const cost = HINT_COSTS.fact
	if (!canAfford(wallet, cost)) {
		return { ok: false, session, error: 'insufficient_balance' }
	}

	const question = currentQuestion(session)
	if (!question) {
		return { ok: false, session, error: 'invalid_question' }
	}

	const element = getElementByAtomicNumber(question.elementAtomicNumber)
	if (!element) {
		return { ok: false, session, error: 'invalid_question' }
	}

	const factText = getSafeFactHint(
		element,
		question.type,
		question.correctAnswer,
	)

	const hintState: SessionHintState = {
		...session.extensions.hintState,
		factUsed: true,
		factText,
	}

	return {
		ok: true,
		cost,
		hintType: 'fact',
		session: withHintState(session, hintState, {
			atomsSpent: session.extensions.atomsSpent + cost,
			hintsUsed: session.extensions.hintsUsed + 1,
			hintUsage: {
				...session.extensions.hintUsage,
				fact: session.extensions.hintUsage.fact + 1,
			},
		}),
	}
}

export function activateSecondChance(
	session: GameSession,
	wallet: AtomWalletState,
): HintApplyResult {
	if (!canUseSecondChance(session)) {
		return {
			ok: false,
			session,
			error: session.extensions.hintState.secondChanceActivated
				? 'already_used'
				: 'not_available',
		}
	}
	const cost = HINT_COSTS.secondChance
	if (!canAfford(wallet, cost)) {
		return { ok: false, session, error: 'insufficient_balance' }
	}

	const hintState: SessionHintState = {
		...session.extensions.hintState,
		secondChanceActivated: true,
	}

	return {
		ok: true,
		cost,
		hintType: 'secondChance',
		session: withHintState(session, hintState, {
			atomsSpent: session.extensions.atomsSpent + cost,
			hintsUsed: session.extensions.hintsUsed + 1,
			hintUsage: {
				...session.extensions.hintUsage,
				secondChance: session.extensions.hintUsage.secondChance + 1,
			},
		}),
	}
}

/**
 * Restore streak after a wrong answer. Does not change score or wrong count.
 */
export function applySaveStreak(
	session: GameSession,
	wallet: AtomWalletState,
): HintApplyResult {
	if (!canOfferSaveStreak(session)) {
		return {
			ok: false,
			session,
			error: session.extensions.hintState.saveStreakUsed
				? 'already_used'
				: 'not_available',
		}
	}
	const cost = HINT_COSTS.saveStreak
	if (!canAfford(wallet, cost)) {
		return { ok: false, session, error: 'insufficient_balance' }
	}

	const restored =
		session.extensions.hintState.streakBeforeWrong ?? session.currentStreak

	const hintState: SessionHintState = {
		...session.extensions.hintState,
		saveStreakUsed: true,
	}

	return {
		ok: true,
		cost,
		hintType: 'saveStreak',
		session: {
			...withHintState(session, hintState, {
				atomsSpent: session.extensions.atomsSpent + cost,
				hintsUsed: session.extensions.hintsUsed + 1,
				hintUsage: {
					...session.extensions.hintUsage,
					saveStreak: session.extensions.hintUsage.saveStreak + 1,
				},
			}),
			currentStreak: restored,
			bestStreak: Math.max(session.bestStreak, restored),
		},
	}
}

export function resetHintStateForNextQuestion(
	session: GameSession,
): GameSession {
	return withHintState(session, createInitialHintState())
}
