import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ROUTES } from '../constants/routes'

/**
 * Params passed to Result after a completed classic sprint.
 * isNewBestScore is computed before overwrite so the UI is correct.
 */
export type ResultScreenParams = {
	score: number
	correctCount: number
	wrongCount: number
	questionCount: number
	accuracy: number
	bestStreak: number
	previousBestScore: number
	isNewBestScore: boolean
	persisted: boolean
}

/**
 * Root stack params for all planned ForestMusic screens.
 */
export type RootStackParamList = {
	[ROUTES.Home]: undefined
	[ROUTES.Game]: { sessionKey?: number } | undefined
	[ROUTES.Result]: ResultScreenParams
	[ROUTES.Modes]: undefined
	[ROUTES.Progress]: undefined
	[ROUTES.Learn]: undefined
	[ROUTES.Achievements]: undefined
	[ROUTES.Settings]: undefined
}

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>
