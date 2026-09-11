import { Text } from 'react-native'
import { Screen } from '../components/Screen'
import { theme } from '../theme'

/** Placeholder progress screen — mastery UI comes later. */
export function ProgressScreen() {
	return (
		<Screen title="Прогресс" subtitle="Статистика и мастерство элементов">
			<Text style={{ color: theme.colors.textSecondary, ...theme.typography.body }}>
				Слой хранения уже подготовлен. Полный UI прогресса будет добавлен в
				следующих фазах.
			</Text>
		</Screen>
	)
}
