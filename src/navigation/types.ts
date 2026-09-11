import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ROUTES } from '../constants/routes'

/**
 * Root stack params for all planned ForestMusic screens.
 * Screens can be filled in gradually without reshaping navigation.
 */
export type RootStackParamList = {
	[ROUTES.Home]: undefined
	[ROUTES.Game]: undefined
	[ROUTES.Modes]: undefined
	[ROUTES.Progress]: undefined
	[ROUTES.Learn]: undefined
	[ROUTES.Achievements]: undefined
	[ROUTES.Settings]: undefined
}

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>
