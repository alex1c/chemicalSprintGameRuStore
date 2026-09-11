/**
 * Navigation route names for the planned ForestMusic screen set.
 */
export const ROUTES = {
	Home: 'Home',
	Game: 'Game',
	Result: 'Result',
	Modes: 'Modes',
	Progress: 'Progress',
	Learn: 'Learn',
	Achievements: 'Achievements',
	Settings: 'Settings',
} as const

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES]
