/**
 * Navigation route names for the planned ForestMusic screen set.
 */
export const ROUTES = {
	Home: 'Home',
	Game: 'Game',
	Result: 'Result',
	Modes: 'Modes',
	Progress: 'Progress',
	ElementDetail: 'ElementDetail',
	Learn: 'Learn',
	LearningArticle: 'LearningArticle',
	Achievements: 'Achievements',
	Settings: 'Settings',
	Onboarding: 'Onboarding',
} as const

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES]
