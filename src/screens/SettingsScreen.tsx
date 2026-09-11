import { Text } from 'react-native'
import { Screen } from '../components/Screen'
import { theme } from '../theme'

/** Placeholder settings screen backed by versioned storage later. */
export function SettingsScreen() {
	return (
		<Screen title="Настройки" subtitle="Звук, вибрация и доступность">
			<Text style={{ color: theme.colors.textSecondary, ...theme.typography.body }}>
				Настройки будут подключены к versioned local storage в следующих фазах.
			</Text>
		</Screen>
	)
}
