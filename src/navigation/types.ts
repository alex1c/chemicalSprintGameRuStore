import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AchievementId } from '../achievements'
import { ROUTES } from '../constants/routes'
import type { AtomRewardBreakdown } from '../economy'
import type { GameModeId } from '../modes'

/**
 * Params passed to Result after a completed sprint.
 */
export type ResultScreenParams = {
	modeId: GameModeId
	score: number
	correctCount: number
	wrongCount: number
	questionCount: number
	accuracy: number
	bestStreak: number
	previousBestScore: number
	isNewBestScore: boolean
	isNewModeRecord: boolean
	persisted: boolean
	atomsEarned: number
	atomBalance: number
	rewardBreakdown: AtomRewardBreakdown
	endReason: string | null
	focusAtomicNumber?: number
	dailyDateKey?: string
	isDailyFirstCompletion?: boolean
	dailyBonusGranted?: number
	dailyCurrentStreak?: number
	dailyStreakGrew?: boolean
	dailyNewStreakStarted?: boolean
	isDailyReplay?: boolean
	newlyUnlockedAchievementIds?: AchievementId[]
}

export type RootStackParamList = {
	[ROUTES.Home]: undefined
	[ROUTES.Game]:
		| {
				sessionKey?: number
				modeId?: GameModeId
				focusAtomicNumber?: number
				dailyDateKey?: string
		  }
		| undefined
	[ROUTES.Result]: ResultScreenParams
	[ROUTES.Modes]: undefined
	[ROUTES.Progress]: undefined
	[ROUTES.ElementDetail]: { atomicNumber: number }
	[ROUTES.Learn]: undefined
	[ROUTES.LearningArticle]: { articleId: string }
	[ROUTES.Achievements]: undefined
	[ROUTES.Settings]: undefined
	[ROUTES.Onboarding]: { manual?: boolean } | undefined
}

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>
