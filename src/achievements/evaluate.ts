import { getMasterySummary, getElementMastery } from '../mastery'
import type { ElementStatsMap, GameModeId, ModeStatsMap } from '../modes'
import type { DailyStateV4 } from '../daily'
import type { AppStatistics } from '../storage/schema'
import {
	ACHIEVEMENT_DEFINITIONS,
	ACHIEVEMENT_THRESHOLDS,
	type AchievementId,
} from './config'

export interface AchievementUnlockRecord {
	unlockedAt: string
}

export type AchievementsUnlockMap = Record<string, AchievementUnlockRecord>

export interface AchievementsPersistedState {
	unlocked: AchievementsUnlockMap
}

export function createEmptyAchievementsState(): AchievementsPersistedState {
	return { unlocked: {} }
}

/**
 * Optional session event for achievements that need exact session outcomes.
 */
export interface AchievementSessionEvent {
	type: 'SESSION_COMPLETED'
	modeId: GameModeId
	correctCount: number
	wrongCount: number
	questionCount: number
	bestStreak: number
	atomsEarned: number
}

export interface AchievementEvaluationInput {
	statistics: AppStatistics
	elementStats: ElementStatsMap
	modeStats: ModeStatsMap
	daily: DailyStateV4
	achievements: AchievementsPersistedState
	event?: AchievementSessionEvent | null
	nowIso?: string
}

export interface AchievementEvaluationResult {
	unlockedIds: AchievementId[]
	newlyUnlockedIds: AchievementId[]
	nextAchievements: AchievementsPersistedState
}

function countFamiliarOrBetter(elementStats: ElementStatsMap): number {
	let count = 0
	for (let atomic = 1; atomic <= 118; atomic += 1) {
		const level = getElementMastery(elementStats[String(atomic)])
		if (level === 'FAMILIAR' || level === 'MASTERED') {
			count += 1
		}
	}
	return count
}

function isConditionMet(
	id: AchievementId,
	input: AchievementEvaluationInput,
): boolean {
	const mastery = getMasterySummary(input.elementStats, 118)
	const familiarOrBetter = countFamiliarOrBetter(input.elementStats)
	const event = input.event

	switch (id) {
		case 'first_atom':
			return (
				input.statistics.correctAnswers >= 1 ||
				(event?.correctCount ?? 0) > 0 ||
				(event != null && event.atomsEarned > 0)
			)
		case 'first_sprint':
			return (input.modeStats.CLASSIC?.gamesPlayed ?? 0) >= 1
		case 'classic_perfect':
			return (
				event?.modeId === 'CLASSIC' &&
				event.questionCount === 10 &&
				event.correctCount === 10 &&
				event.wrongCount === 0
			)
		case 'streak_10':
			return (
				input.statistics.bestStreak >= ACHIEVEMENT_THRESHOLDS.streak10 ||
				(event?.bestStreak ?? 0) >= ACHIEVEMENT_THRESHOLDS.streak10
			)
		case 'mastery_10':
			return familiarOrBetter >= ACHIEVEMENT_THRESHOLDS.masteryFamiliarOrBetter
		case 'mastery_25':
			return mastery.mastered >= ACHIEVEMENT_THRESHOLDS.mastery25
		case 'mastery_50':
			return mastery.mastered >= ACHIEVEMENT_THRESHOLDS.mastery50
		case 'mastery_100':
			return mastery.mastered >= ACHIEVEMENT_THRESHOLDS.mastery100
		case 'mastery_118':
			return mastery.mastered >= ACHIEVEMENT_THRESHOLDS.mastery118
		case 'daily_3':
			return input.daily.bestStreak >= ACHIEVEMENT_THRESHOLDS.daily3
		case 'daily_7':
			return input.daily.bestStreak >= ACHIEVEMENT_THRESHOLDS.daily7
		case 'daily_30':
			return input.daily.bestStreak >= ACHIEVEMENT_THRESHOLDS.daily30
		case 'second_chance_10':
			return (
				input.statistics.hintsUsed.secondChance >=
				ACHIEVEMENT_THRESHOLDS.secondChance10
			)
		case 'fact_hint_10':
			return (
				input.statistics.hintsUsed.fact >= ACHIEVEMENT_THRESHOLDS.factHint10
			)
		case 'no_mistake_20':
			return (
				(input.modeStats.NO_MISTAKE?.bestCorrect ?? 0) >=
				ACHIEVEMENT_THRESHOLDS.noMistake20
			)
		default: {
			const _exhaustive: never = id
			return _exhaustive
		}
	}
}

/**
 * Evaluate all achievements against persisted state (+ optional session event).
 * Already unlocked IDs keep their unlockedAt; newly unlocked get nowIso.
 */
export function evaluateAchievements(
	input: AchievementEvaluationInput,
): AchievementEvaluationResult {
	const nowIso = input.nowIso ?? new Date().toISOString()
	const previous = input.achievements.unlocked
	const nextUnlocked: AchievementsUnlockMap = { ...previous }
	const newlyUnlockedIds: AchievementId[] = []

	for (const definition of ACHIEVEMENT_DEFINITIONS) {
		const id = definition.id
		const already = Boolean(previous[id])
		if (already) {
			continue
		}
		if (isConditionMet(id, input)) {
			nextUnlocked[id] = { unlockedAt: nowIso }
			newlyUnlockedIds.push(id)
		}
	}

	const unlockedIds = ACHIEVEMENT_DEFINITIONS.map((d) => d.id).filter(
		(id) => Boolean(nextUnlocked[id]),
	)

	return {
		unlockedIds,
		newlyUnlockedIds,
		nextAchievements: { unlocked: nextUnlocked },
	}
}

export interface AchievementProgress {
	current: number
	target: number
	ratio: number
}

/**
 * Progress snapshot for threshold achievements (UI). Locked or unlocked.
 */
export function getAchievementProgress(
	id: AchievementId,
	input: Omit<AchievementEvaluationInput, 'achievements' | 'event' | 'nowIso'>,
): AchievementProgress | null {
	const mastery = getMasterySummary(input.elementStats, 118)
	const familiarOrBetter = countFamiliarOrBetter(input.elementStats)

	switch (id) {
		case 'streak_10':
			return {
				current: Math.min(
					input.statistics.bestStreak,
					ACHIEVEMENT_THRESHOLDS.streak10,
				),
				target: ACHIEVEMENT_THRESHOLDS.streak10,
				ratio: Math.min(
					1,
					input.statistics.bestStreak / ACHIEVEMENT_THRESHOLDS.streak10,
				),
			}
		case 'mastery_10':
			return {
				current: Math.min(
					familiarOrBetter,
					ACHIEVEMENT_THRESHOLDS.masteryFamiliarOrBetter,
				),
				target: ACHIEVEMENT_THRESHOLDS.masteryFamiliarOrBetter,
				ratio: Math.min(
					1,
					familiarOrBetter / ACHIEVEMENT_THRESHOLDS.masteryFamiliarOrBetter,
				),
			}
		case 'mastery_25':
		case 'mastery_50':
		case 'mastery_100':
		case 'mastery_118': {
			const target =
				id === 'mastery_25'
					? ACHIEVEMENT_THRESHOLDS.mastery25
					: id === 'mastery_50'
						? ACHIEVEMENT_THRESHOLDS.mastery50
						: id === 'mastery_100'
							? ACHIEVEMENT_THRESHOLDS.mastery100
							: ACHIEVEMENT_THRESHOLDS.mastery118
			return {
				current: Math.min(mastery.mastered, target),
				target,
				ratio: Math.min(1, mastery.mastered / target),
			}
		}
		case 'daily_3':
		case 'daily_7':
		case 'daily_30': {
			const target =
				id === 'daily_3'
					? ACHIEVEMENT_THRESHOLDS.daily3
					: id === 'daily_7'
						? ACHIEVEMENT_THRESHOLDS.daily7
						: ACHIEVEMENT_THRESHOLDS.daily30
			return {
				current: Math.min(input.daily.bestStreak, target),
				target,
				ratio: Math.min(1, input.daily.bestStreak / target),
			}
		}
		case 'second_chance_10':
			return {
				current: Math.min(
					input.statistics.hintsUsed.secondChance,
					ACHIEVEMENT_THRESHOLDS.secondChance10,
				),
				target: ACHIEVEMENT_THRESHOLDS.secondChance10,
				ratio: Math.min(
					1,
					input.statistics.hintsUsed.secondChance /
						ACHIEVEMENT_THRESHOLDS.secondChance10,
				),
			}
		case 'fact_hint_10':
			return {
				current: Math.min(
					input.statistics.hintsUsed.fact,
					ACHIEVEMENT_THRESHOLDS.factHint10,
				),
				target: ACHIEVEMENT_THRESHOLDS.factHint10,
				ratio: Math.min(
					1,
					input.statistics.hintsUsed.fact / ACHIEVEMENT_THRESHOLDS.factHint10,
				),
			}
		case 'no_mistake_20':
			return {
				current: Math.min(
					input.modeStats.NO_MISTAKE?.bestCorrect ?? 0,
					ACHIEVEMENT_THRESHOLDS.noMistake20,
				),
				target: ACHIEVEMENT_THRESHOLDS.noMistake20,
				ratio: Math.min(
					1,
					(input.modeStats.NO_MISTAKE?.bestCorrect ?? 0) /
						ACHIEVEMENT_THRESHOLDS.noMistake20,
				),
			}
		default:
			return null
	}
}

export function sanitizeAchievementsState(
	value: unknown,
): AchievementsPersistedState {
	const empty = createEmptyAchievementsState()
	if (!value || typeof value !== 'object') {
		return empty
	}
	const raw = value as Record<string, unknown>
	const unlockedRaw = raw.unlocked
	// Legacy v4 unlockedIds → empty unlocks (engine backfills on evaluate).
	if (Array.isArray((raw as { unlockedIds?: unknown }).unlockedIds)) {
		return empty
	}
	if (!unlockedRaw || typeof unlockedRaw !== 'object' || Array.isArray(unlockedRaw)) {
		return empty
	}
	const unlocked: AchievementsUnlockMap = {}
	for (const [id, entry] of Object.entries(
		unlockedRaw as Record<string, unknown>,
	)) {
		if (!entry || typeof entry !== 'object') {
			continue
		}
		const unlockedAt = (entry as { unlockedAt?: unknown }).unlockedAt
		if (typeof unlockedAt === 'string' && unlockedAt.length > 0) {
			unlocked[id] = { unlockedAt }
		}
	}
	return { unlocked }
}
