import {
	ELEMENTS,
	getElementByAtomicNumber,
	type ChemicalElement,
} from '../data/chemistry'
import {
	createDailyChallenge,
	getLocalDateKey,
	isValidDateKey,
} from '../daily'
import {
	ELEMENT_TRAINING_QUESTION_COUNT,
} from '../mastery'
import {
	getGameModeConfig,
	getWeakModeAvailability,
	type ElementStatsMap,
	type GameModeId,
} from '../modes'
import { createGameSession, type CreateSessionOptions } from './session'
import type { GameSession } from './types'

export interface CreateModeSessionOptions
	extends Omit<CreateSessionOptions, 'modeId' | 'elements'> {
	elementStats?: ElementStatsMap
	/** Required for ELEMENT_TRAINING. */
	focusAtomicNumber?: number
	/** Daily challenge date key; defaults to today when omitted for DAILY. */
	dailyDateKey?: string
}

export type { WeakModeAvailability } from '../modes'

export { getWeakModeAvailability }

function elementsFromAtomicNumbers(
	atomicNumbers: readonly number[],
): ChemicalElement[] {
	const set = new Set(atomicNumbers)
	return ELEMENTS.filter((el) => set.has(el.atomicNumber))
}

/**
 * Create a session for any playable / contextual mode.
 * Returns null for Weak Elements when the weak pool is insufficient,
 * or for ELEMENT_TRAINING when focusAtomicNumber is missing/invalid.
 */
export function createModeSession(
	modeId: GameModeId,
	options: CreateModeSessionOptions = {},
): GameSession | null {
	const mode = getGameModeConfig(modeId)

	if (modeId === 'DAILY') {
		const dateKey = options.dailyDateKey ?? getLocalDateKey()
		if (!isValidDateKey(dateKey)) {
			return null
		}
		const challenge = createDailyChallenge(dateKey)
		return createGameSession({
			...options,
			modeId,
			seed: challenge.seed,
			questions: challenge.questions,
			questionCount: challenge.questions.length,
			challengeDateKey: dateKey,
			// Unique per attempt so replay completions are not blocked by session-id idempotency.
			sessionId:
				options.sessionId ??
				`session-DAILY-${dateKey}-${Date.now()}`,
		})
	}

	if (modeId === 'ELEMENT_TRAINING') {
		const atomic = options.focusAtomicNumber
		if (typeof atomic !== 'number') {
			return null
		}
		const element = getElementByAtomicNumber(atomic)
		if (!element) {
			return null
		}
		return createGameSession({
			...options,
			modeId,
			focusAtomicNumber: atomic,
			questionCount:
				options.questionCount ??
				mode.questionCount ??
				ELEMENT_TRAINING_QUESTION_COUNT,
			avoidConsecutiveElementRepeats: false,
			challengeDateKey: null,
		})
	}

	if (modeId === 'WEAK_ELEMENTS') {
		const availability = getWeakModeAvailability(options.elementStats ?? {})
		if (!availability.available) {
			return null
		}
		const weakElements = elementsFromAtomicNumbers(availability.atomicNumbers)
		return createGameSession({
			...options,
			modeId,
			questionCount: mode.questionCount ?? 10,
			elements: weakElements,
			avoidConsecutiveElementRepeats: true,
			challengeDateKey: null,
		})
	}

	return createGameSession({
		...options,
		modeId,
		questionCount:
			options.questionCount ?? mode.questionCount ?? mode.poolSize,
		avoidConsecutiveElementRepeats: true,
		challengeDateKey: null,
	})
}

/**
 * Classic Sprint factory kept for backward-compatible call sites.
 */
export function createClassicSprintSession(
	options: CreateModeSessionOptions = {},
): GameSession {
	return createModeSession('CLASSIC', options)!
}
