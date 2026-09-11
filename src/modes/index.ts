export type {
	GameModeId,
	GameModeConfig,
	SessionEndCondition,
	SessionEndReason,
	ModeFeedbackTiming,
	ModeRewardConfig,
	ModeRecordField,
} from './types'

export {
	GAME_MODE_CONFIGS,
	GAME_MODE_ORDER,
	getGameModeConfig,
	isHintAllowed,
} from './config'

export {
	createEmptyElementPerformance,
	applyElementOutcome,
	weaknessScore,
	isWeakElement,
	rankWeakAtomicNumbers,
	getWeakModeAvailability,
	WEAK_POOL_MIN_SIZE,
} from './elementPerformance'

export type {
	ElementPerformance,
	ElementStatsMap,
	ElementOutcome,
	WeakModeAvailability,
} from './elementPerformance'

export {
	createEmptyModeStats,
	createDefaultModeStatsMap,
	applyModeSessionToStats,
} from './modeStats'

export type { ModeStats, ModeStatsMap, ModeSessionSummary } from './modeStats'
