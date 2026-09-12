/**
 * Achievement definitions for local unlock evaluation.
 */

export type AchievementCategory =
	| 'start'
	| 'knowledge'
	| 'streaks'
	| 'modes'
	| 'daily'
	| 'hints'

export type AchievementId =
	| 'first_atom'
	| 'first_sprint'
	| 'classic_perfect'
	| 'streak_10'
	| 'mastery_10'
	| 'mastery_25'
	| 'mastery_50'
	| 'mastery_100'
	| 'mastery_118'
	| 'daily_3'
	| 'daily_7'
	| 'daily_30'
	| 'second_chance_10'
	| 'fact_hint_10'
	| 'no_mistake_20'

export interface AchievementDefinition {
	id: AchievementId
	titleRu: string
	descriptionRu: string
	icon: string
	category: AchievementCategory
	/** Optional progress denominator for UI (threshold achievements). */
	progressTarget?: number
}

export const ACHIEVEMENT_THRESHOLDS = {
	streak10: 10,
	masteryFamiliarOrBetter: 10,
	mastery25: 25,
	mastery50: 50,
	mastery100: 100,
	mastery118: 118,
	daily3: 3,
	daily7: 7,
	daily30: 30,
	secondChance10: 10,
	factHint10: 10,
	noMistake20: 20,
} as const

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
	{
		id: 'first_atom',
		titleRu: 'Первый атом',
		descriptionRu: 'Заработай первые атомы в игре',
		icon: '⚛',
		category: 'start',
	},
	{
		id: 'first_sprint',
		titleRu: 'Первый спринт',
		descriptionRu: 'Заверши первый классический спринт',
		icon: '🧪',
		category: 'start',
	},
	{
		id: 'classic_perfect',
		titleRu: 'Безошибочный',
		descriptionRu: 'Пройди Classic на 10 из 10',
		icon: '💎',
		category: 'modes',
	},
	{
		id: 'streak_10',
		titleRu: 'Цепная реакция',
		descriptionRu: 'Набери серию из 10 правильных ответов подряд',
		icon: '🔥',
		category: 'streaks',
		progressTarget: ACHIEVEMENT_THRESHOLDS.streak10,
	},
	{
		id: 'mastery_10',
		titleRu: '10 элементов',
		descriptionRu: 'Доведи 10 элементов до статуса «Знаком» или выше',
		icon: '🔟',
		category: 'knowledge',
		progressTarget: ACHIEVEMENT_THRESHOLDS.masteryFamiliarOrBetter,
	},
	{
		id: 'mastery_25',
		titleRu: '25 элементов',
		descriptionRu: 'Освой 25 элементов таблицы',
		icon: '📗',
		category: 'knowledge',
		progressTarget: ACHIEVEMENT_THRESHOLDS.mastery25,
	},
	{
		id: 'mastery_50',
		titleRu: '50 элементов',
		descriptionRu: 'Освой половину таблицы — 50 элементов',
		icon: '📘',
		category: 'knowledge',
		progressTarget: ACHIEVEMENT_THRESHOLDS.mastery50,
	},
	{
		id: 'mastery_100',
		titleRu: '100 элементов',
		descriptionRu: 'Освой 100 элементов',
		icon: '📙',
		category: 'knowledge',
		progressTarget: ACHIEVEMENT_THRESHOLDS.mastery100,
	},
	{
		id: 'mastery_118',
		titleRu: 'Периодическая легенда',
		descriptionRu: 'Освой все 118 элементов',
		icon: '🏆',
		category: 'knowledge',
		progressTarget: ACHIEVEMENT_THRESHOLDS.mastery118,
	},
	{
		id: 'daily_3',
		titleRu: 'Возвращение',
		descriptionRu: 'Достигни серии Daily из 3 дней',
		icon: '📅',
		category: 'daily',
		progressTarget: ACHIEVEMENT_THRESHOLDS.daily3,
	},
	{
		id: 'daily_7',
		titleRu: 'Неделя химии',
		descriptionRu: 'Достигни серии Daily из 7 дней',
		icon: '🗓️',
		category: 'daily',
		progressTarget: ACHIEVEMENT_THRESHOLDS.daily7,
	},
	{
		id: 'daily_30',
		titleRu: 'Месяц практики',
		descriptionRu: 'Достигни лучшей серии Daily в 30 дней',
		icon: '🌟',
		category: 'daily',
		progressTarget: ACHIEVEMENT_THRESHOLDS.daily30,
	},
	{
		id: 'second_chance_10',
		titleRu: 'Не сдаюсь',
		descriptionRu: 'Используй «Вторую попытку» 10 раз',
		icon: '🛡',
		category: 'hints',
		progressTarget: ACHIEVEMENT_THRESHOLDS.secondChance10,
	},
	{
		id: 'fact_hint_10',
		titleRu: 'Подсказчик',
		descriptionRu: 'Используй подсказку Fact 10 раз',
		icon: '💡',
		category: 'hints',
		progressTarget: ACHIEVEMENT_THRESHOLDS.factHint10,
	},
	{
		id: 'no_mistake_20',
		titleRu: 'Без права на ошибку',
		descriptionRu: 'Набери 20 верных подряд в режиме «Без ошибки»',
		icon: '❤️',
		category: 'modes',
		progressTarget: ACHIEVEMENT_THRESHOLDS.noMistake20,
	},
] as const

export const ACHIEVEMENT_IDS: readonly AchievementId[] =
	ACHIEVEMENT_DEFINITIONS.map((item) => item.id)

export const ACHIEVEMENT_BY_ID: Record<
	AchievementId,
	AchievementDefinition
> = ACHIEVEMENT_DEFINITIONS.reduce(
	(acc, item) => {
		acc[item.id] = item
		return acc
	},
	{} as Record<AchievementId, AchievementDefinition>,
)

export const CATEGORY_LABELS_RU: Record<AchievementCategory, string> = {
	start: 'Начало',
	knowledge: 'Знания',
	streaks: 'Серии',
	modes: 'Режимы',
	daily: 'Ежедневная игра',
	hints: 'Подсказки',
}
