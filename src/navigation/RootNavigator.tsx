import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AdsBootstrap } from '../ads'
import { activateAnalytics, trackEvent } from '../analytics'
import { ROUTES } from '../constants/routes'
import { AchievementsScreen } from '../screens/AchievementsScreen'
import { ElementDetailScreen } from '../screens/ElementDetailScreen'
import { GameScreen } from '../screens/GameScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { LearnScreen } from '../screens/LearnScreen'
import { LearningArticleScreen } from '../screens/LearningArticleScreen'
import { ModesScreen } from '../screens/ModesScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { PrivacyScreen } from '../screens/PrivacyScreen'
import { ProgressScreen } from '../screens/ProgressScreen'
import { ResultScreen } from '../screens/ResultScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { loadOnboardingCompleted } from '../stats'
import { theme } from '../theme'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

/**
 * Root navigator with first-run onboarding gate.
 */
export function RootNavigator() {
	const [ready, setReady] = useState(false)
	const [showOnboarding, setShowOnboarding] = useState(false)

	useEffect(() => {
		let mounted = true
		activateAnalytics()
		trackEvent('app_open')
		void loadOnboardingCompleted().then((completed) => {
			if (!mounted) {
				return
			}
			setShowOnboarding(!completed)
			setReady(true)
		})
		return () => {
			mounted = false
		}
	}, [])

	if (!ready) {
		return (
			<View style={styles.boot}>
				<ActivityIndicator color={theme.colors.brand} />
			</View>
		)
	}

	return (
		<AdsBootstrap>
			<NavigationContainer>
				<Stack.Navigator
					initialRouteName={
						showOnboarding ? ROUTES.Onboarding : ROUTES.Home
					}
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
						name={ROUTES.Onboarding}
						component={OnboardingScreen}
						options={{ headerShown: false }}
					/>
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
						name={ROUTES.LearningArticle}
						component={LearningArticleScreen}
						options={{ title: 'Статья', headerBackTitle: 'Назад' }}
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
					<Stack.Screen
						name={ROUTES.Privacy}
						component={PrivacyScreen}
						options={{ title: 'Конфиденциальность' }}
					/>
				</Stack.Navigator>
			</NavigationContainer>
		</AdsBootstrap>
	)
}

const styles = StyleSheet.create({
	boot: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: theme.colors.background,
	},
})
