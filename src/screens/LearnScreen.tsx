import { Text } from 'react-native'
import { Screen } from '../components/Screen'
import { theme } from '../theme'

/**
 * ForestMusic-required Learn section.
 * Cards/content will be added later; the route must remain available.
 */
export function LearnScreen() {
	return (
		<Screen title="Обучение" subtitle="Карточки по таблице Менделеева">
			<Text style={{ color: theme.colors.textSecondary, ...theme.typography.body }}>
				Раздел обучения обязателен по playbook ForestMusic. Учебные карточки будут
				добавлены в следующих фазах — маршрут уже зарезервирован.
			</Text>
		</Screen>
	)
}
