import { Text } from 'react-native'
import { Screen } from '../components/Screen'
import { theme } from '../theme'

/** Placeholder for future quiz mode selection. */
export function ModesScreen() {
	return (
		<Screen title="Режимы" subtitle="Классика и будущие режимы">
			<Text style={{ color: theme.colors.textSecondary, ...theme.typography.body }}>
				Пока доступен классический спринт из 10 вопросов. Другие режимы появятся
				позже.
			</Text>
		</Screen>
	)
}
