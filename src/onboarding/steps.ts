/**
 * First-run onboarding steps (max 3). Separate from the Learn section.
 */

export interface OnboardingStep {
	id: string
	titleRu: string
	bodyRu: string
	emoji: string
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
	{
		id: 'welcome',
		emoji: '🧪',
		titleRu: 'Химический спринт',
		bodyRu: 'Угадывай элементы, символы и атомные номера в быстрых раундах.',
	},
	{
		id: 'atoms',
		emoji: '⚛',
		titleRu: 'Атомы и подсказки',
		bodyRu:
			'Играй, зарабатывай атомы и используй подсказки, когда они нужны.',
	},
	{
		id: 'mastery',
		emoji: '🏆',
		titleRu: '118 элементов',
		bodyRu:
			'Тренируй слабые места и постепенно освой всю таблицу Менделеева.',
	},
] as const
