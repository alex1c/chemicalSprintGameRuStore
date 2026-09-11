import { Text } from 'react-native'
import { Screen } from '../components/Screen'
import { theme } from '../theme'

/** Placeholder achievements screen. */
export function AchievementsScreen() {
	return (
		<Screen title="Достижения" subtitle="Будущие награды за серии и точность">
			<Text style={{ color: theme.colors.textSecondary, ...theme.typography.body }}>
				Схема достижений заложена в persistence. Контент появится позже.
			</Text>
		</Screen>
	)
}
