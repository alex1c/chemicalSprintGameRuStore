import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ROUTES } from '../constants/routes'
import { AchievementsScreen } from '../screens/AchievementsScreen'
import { ElementDetailScreen } from '../screens/ElementDetailScreen'
import { GameScreen } from '../screens/GameScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { LearnScreen } from '../screens/LearnScreen'
import { ModesScreen } from '../screens/ModesScreen'
import { ProgressScreen } from '../screens/ProgressScreen'
import { ResultScreen } from '../screens/ResultScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { theme } from '../theme'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

/**
 * Root navigator with all planned routes registered for incremental UI work.
 */
export function RootNavigator() {
	return (
		<NavigationContainer>
			<Stack.Navigator
				initialRouteName={ROUTES.Home}
				screenOptions={{
					headerStyle: { backgroundColor: theme.colors.background },
					headerTintColor: theme.colors.brand,
					headerTitleStyle: {
						fontWeight: '600',
						color: theme.colors.textPrimary,
					},
					contentStyle: { backgroundColor: theme.colors.background },
				}}
			>
				<Stack.Screen
					name={ROUTES.Home}
					component={HomeScreen}
					options={{ title: 'Главная', headerShown: false }}
				/>
				<Stack.Screen
					name={ROUTES.Game}
					component={GameScreen}
					options={{ title: 'Спринт', headerBackTitle: 'Назад' }}
				/>
				<Stack.Screen
					name={ROUTES.Result}
					component={ResultScreen}
					options={{ title: 'Результат', headerShown: false }}
				/>
				<Stack.Screen
					name={ROUTES.Modes}
					component={ModesScreen}
					options={{ title: 'Режимы' }}
				/>
				<Stack.Screen
					name={ROUTES.Progress}
					component={ProgressScreen}
					options={{ title: 'Прогресс' }}
				/>
				<Stack.Screen
					name={ROUTES.ElementDetail}
					component={ElementDetailScreen}
					options={({ route }) => ({
						title: `№${route.params.atomicNumber}`,
						headerBackTitle: 'Назад',
					})}
				/>
				<Stack.Screen
					name={ROUTES.Learn}
					component={LearnScreen}
					options={{ title: 'Обучение' }}
				/>
				<Stack.Screen
					name={ROUTES.Achievements}
					component={AchievementsScreen}
					options={{ title: 'Достижения' }}
				/>
				<Stack.Screen
					name={ROUTES.Settings}
					component={SettingsScreen}
					options={{ title: 'Настройки' }}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	)
}
