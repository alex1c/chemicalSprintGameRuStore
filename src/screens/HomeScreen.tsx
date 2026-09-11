import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { APP_DISPLAY_NAME } from '../constants/app'
import { ROUTES } from '../constants/routes'
import type { RootStackParamList } from '../navigation/types'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

/**
 * Home hub — path to first question is designed for ≤2 actions later.
 */
export function HomeScreen({ navigation }: Props) {
	return (
		<Screen
			title={APP_DISPLAY_NAME}
			subtitle="Быстрая викторина по таблице Менделеева"
		>
			<View style={styles.actions}>
				<PrimaryButton
					label="Играть"
					onPress={() => navigation.navigate(ROUTES.Game)}
				/>
				<PrimaryButton
					label="Режимы"
					onPress={() => navigation.navigate(ROUTES.Modes)}
				/>
				<PrimaryButton
					label="Обучение"
					onPress={() => navigation.navigate(ROUTES.Learn)}
				/>
				<PrimaryButton
					label="Прогресс"
					onPress={() => navigation.navigate(ROUTES.Progress)}
				/>
				<PrimaryButton
					label="Достижения"
					onPress={() => navigation.navigate(ROUTES.Achievements)}
				/>
				<PrimaryButton
					label="Настройки"
					onPress={() => navigation.navigate(ROUTES.Settings)}
				/>
			</View>
			<Text style={styles.hint}>
				Цель продукта: от запуска до первого вопроса — максимум 2 действия.
			</Text>
		</Screen>
	)
}

const styles = StyleSheet.create({
	actions: {
		gap: theme.spacing.sm,
	},
	hint: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.xl,
	},
})
