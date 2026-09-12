export {
	getLocalDateKey,
	parseLocalDateKey,
	isValidDateKey,
	isValidCalendarDay,
	differenceInLocalCalendarDays,
	getPreviousDateKey,
} from './date'

export type { LocalDateParts } from './date'

export {
	DAILY_GENERATION_VERSION,
	DAILY_COMPLETION_BONUS,
	DAILY_QUESTION_COUNT,
	hashStringToSeed,
	createDailySeed,
} from './seed'

export {
	createDailyChallenge,
	buildDailyTypePlan,
	pickDailyElements,
} from './challenge'

export {
	createEmptyDailyState,
	isDailyCompleted,
	getDailyBest,
	getDailyStreakUpdate,
	applyDailyCompletion,
	getTodayDailyState,
	sanitizeDailyState,
} from './state'

export type {
	DailyHistoryEntry,
	DailyStateV4,
	DailyStreakUpdate,
	DailyCompletionInput,
	DailyCompletionResult,
	TodayDailyView,
} from './state'
