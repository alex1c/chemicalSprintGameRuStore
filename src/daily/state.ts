import { isValidDateKey, differenceInLocalCalendarDays } from './date'

/**
 * One calendar day's best Daily result (first completion + later bests).
 */
export interface DailyHistoryEntry {
	completed: boolean
	score: number
	correct: number
	total: number
	bestStreak: number
	/** Atoms earned on the first completion (including daily bonus); 0 on replay-only. */
	atomsEarned: number
	completedAt: string
	firstCompletionAt: string
	bestScore: number
	bestCorrect: number
	bestAccuracy: number
	/** True when the one-time daily completion bonus was granted for this date. */
	bonusGranted: boolean
}

export interface DailyStateV4 {
	currentStreak: number
	bestStreak: number
	lastCompletedDateKey: string | null
	history: Record<string, DailyHistoryEntry>
}

export function createEmptyDailyState(): DailyStateV4 {
	return {
		currentStreak: 0,
		bestStreak: 0,
		lastCompletedDateKey: null,
		history: {},
	}
}

export function isDailyCompleted(
	state: DailyStateV4,
	dateKey: string,
): boolean {
	return state.history[dateKey]?.completed === true
}

export function getDailyBest(
	state: DailyStateV4,
	dateKey: string,
): DailyHistoryEntry | null {
	return state.history[dateKey] ?? null
}

export interface DailyStreakUpdate {
	currentStreak: number
	bestStreak: number
	lastCompletedDateKey: string
	streakGrew: boolean
	newStreakStarted: boolean
}

/**
 * Compute streak changes for the first completion of challengeDateKey.
 * Uses calendar date keys (not wall-clock deltas).
 */
export function getDailyStreakUpdate(
	state: DailyStateV4,
	challengeDateKey: string,
): DailyStreakUpdate {
	if (!isValidDateKey(challengeDateKey)) {
		throw new Error(`Invalid challenge date key: ${challengeDateKey}`)
	}

	const previous = state.lastCompletedDateKey
	let currentStreak = 1
	let newStreakStarted = true
	let streakGrew = false

	if (previous && isValidDateKey(previous)) {
		const gap = differenceInLocalCalendarDays(challengeDateKey, previous)
		if (gap === 0) {
			// Same day — should not call on first-completion path, but stay stable.
			currentStreak = Math.max(1, state.currentStreak)
			newStreakStarted = false
			streakGrew = false
		} else if (gap === 1) {
			currentStreak = state.currentStreak + 1
			newStreakStarted = false
			streakGrew = true
		} else {
			currentStreak = 1
			newStreakStarted = true
			streakGrew = false
		}
	}

	const bestStreak = Math.max(state.bestStreak, currentStreak)
	return {
		currentStreak,
		bestStreak,
		lastCompletedDateKey: challengeDateKey,
		streakGrew,
		newStreakStarted,
	}
}

export interface DailyCompletionInput {
	dateKey: string
	score: number
	correct: number
	total: number
	bestStreak: number
	accuracy: number
	atomsEarned: number
	bonusGranted: boolean
	completedAt: string
}

export interface DailyCompletionResult {
	state: DailyStateV4
	isFirstCompletion: boolean
	streakGrew: boolean
	newStreakStarted: boolean
	currentStreak: number
}

/**
 * Apply a finished Daily session to persisted daily state.
 * First completion grants streak/bonus bookkeeping; replays can improve bests.
 */
export function applyDailyCompletion(
	previous: DailyStateV4,
	input: DailyCompletionInput,
): DailyCompletionResult {
	const existing = previous.history[input.dateKey]
	const isFirstCompletion = !existing?.completed

	if (isFirstCompletion) {
		const streak = getDailyStreakUpdate(previous, input.dateKey)
		const entry: DailyHistoryEntry = {
			completed: true,
			score: input.score,
			correct: input.correct,
			total: input.total,
			bestStreak: input.bestStreak,
			atomsEarned: input.atomsEarned,
			completedAt: input.completedAt,
			firstCompletionAt: input.completedAt,
			bestScore: input.score,
			bestCorrect: input.correct,
			bestAccuracy: input.accuracy,
			bonusGranted: input.bonusGranted,
		}
		return {
			isFirstCompletion: true,
			streakGrew: streak.streakGrew,
			newStreakStarted: streak.newStreakStarted,
			currentStreak: streak.currentStreak,
			state: {
				currentStreak: streak.currentStreak,
				bestStreak: streak.bestStreak,
				lastCompletedDateKey: streak.lastCompletedDateKey,
				history: {
					...previous.history,
					[input.dateKey]: entry,
				},
			},
		}
	}

	const entry: DailyHistoryEntry = {
		...existing!,
		completed: true,
		score: Math.max(existing!.score, input.score),
		correct: Math.max(existing!.correct, input.correct),
		bestStreak: Math.max(existing!.bestStreak, input.bestStreak),
		bestScore: Math.max(existing!.bestScore, input.score),
		bestCorrect: Math.max(existing!.bestCorrect, input.correct),
		bestAccuracy: Math.max(existing!.bestAccuracy, input.accuracy),
		completedAt: input.completedAt,
		// atomsEarned / bonusGranted / firstCompletionAt stay from first run
	}

	return {
		isFirstCompletion: false,
		streakGrew: false,
		newStreakStarted: false,
		currentStreak: previous.currentStreak,
		state: {
			...previous,
			history: {
				...previous.history,
				[input.dateKey]: entry,
			},
		},
	}
}

export interface TodayDailyView {
	dateKey: string
	completed: boolean
	entry: DailyHistoryEntry | null
	currentStreak: number
	bestStreak: number
}

export function getTodayDailyState(
	state: DailyStateV4,
	todayKey: string,
): TodayDailyView {
	const entry = state.history[todayKey] ?? null
	return {
		dateKey: todayKey,
		completed: entry?.completed === true,
		entry,
		currentStreak: state.currentStreak,
		bestStreak: state.bestStreak,
	}
}

/**
 * Sanitize unknown daily payload into a safe DailyStateV4.
 */
export function sanitizeDailyState(value: unknown): DailyStateV4 {
	const fallback = createEmptyDailyState()
	if (!value || typeof value !== 'object') {
		return fallback
	}
	const raw = value as Record<string, unknown>
	const currentStreak = nonNeg(raw.currentStreak, 0)
	let bestStreak = nonNeg(raw.bestStreak, 0)
	bestStreak = Math.max(bestStreak, currentStreak)

	const lastCompletedDateKey =
		typeof raw.lastCompletedDateKey === 'string' &&
		isValidDateKey(raw.lastCompletedDateKey)
			? raw.lastCompletedDateKey
			: null

	const history: Record<string, DailyHistoryEntry> = {}
	if (raw.history && typeof raw.history === 'object' && !Array.isArray(raw.history)) {
		for (const [key, entryRaw] of Object.entries(
			raw.history as Record<string, unknown>,
		)) {
			if (!isValidDateKey(key) || !entryRaw || typeof entryRaw !== 'object') {
				continue
			}
			const e = entryRaw as Record<string, unknown>
			const total = nonNeg(e.total, 0)
			const correct = Math.min(nonNeg(e.correct, 0), total || nonNeg(e.correct, 0))
			history[key] = {
				completed: e.completed === true,
				score: nonNeg(e.score, 0),
				correct,
				total,
				bestStreak: nonNeg(e.bestStreak, 0),
				atomsEarned: nonNeg(e.atomsEarned, 0),
				completedAt:
					typeof e.completedAt === 'string' ? e.completedAt : '',
				firstCompletionAt:
					typeof e.firstCompletionAt === 'string'
						? e.firstCompletionAt
						: typeof e.completedAt === 'string'
							? e.completedAt
							: '',
				bestScore: nonNeg(e.bestScore, nonNeg(e.score, 0)),
				bestCorrect: nonNeg(e.bestCorrect, correct),
				bestAccuracy: clampUnit(e.bestAccuracy, 0),
				bonusGranted: e.bonusGranted === true,
			}
		}
	}

	return {
		currentStreak,
		bestStreak,
		lastCompletedDateKey,
		history,
	}
}

function nonNeg(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? Math.floor(value)
		: fallback
}

function clampUnit(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return fallback
	}
	if (value < 0) {
		return 0
	}
	if (value > 1) {
		return 1
	}
	return value
}
