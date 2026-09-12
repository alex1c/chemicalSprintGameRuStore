import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Screen } from '../components/Screen'
import { APP_DISPLAY_NAME, APP_VERSION } from '../constants/app'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { ROUTES } from '../constants/routes'
import type { RootStackParamList } from '../navigation/types'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

/**
 * Minimal settings: replay onboarding + about/version.
 * No fake sound/haptic toggles until those systems exist.
 */
export function SettingsScreen({ navigation }: Props) {
	return (
		<Screen edges={['left', 'right', 'bottom']}>
			<Text style={styles.section}>Обучение</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Пройти вводное обучение снова"
				onPress={() =>
					navigation.navigate(ROUTES.Onboarding, { manual: true })
				}
				style={styles.row}
			>
				<Text style={styles.rowTitle}>Пройти вводное обучение снова</Text>
				<Text style={styles.rowHint}>
					Откроет 3 коротких шага без сброса прогресса
				</Text>
			</Pressable>

			<Text style={styles.section}>О приложении</Text>
			<View style={styles.about}>
				<Text style={styles.aboutTitle}>{APP_DISPLAY_NAME}</Text>
				<Text style={styles.aboutVersion}>Версия {APP_VERSION}</Text>
				<Text style={styles.aboutBody}>
					Быстрая игра для запоминания элементов таблицы Менделеева.
				</Text>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	section: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		fontWeight: '700',
		marginBottom: theme.spacing.sm,
		marginTop: theme.spacing.md,
	},
	row: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		padding: theme.spacing.md,
		minHeight: MIN_TOUCH_TARGET + 12,
		marginBottom: theme.spacing.md,
	},
	rowTitle: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
	},
	rowHint: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.xxs,
	},
	about: {
		backgroundColor: theme.colors.surfaceMuted,
		borderRadius: theme.radius.lg,
		padding: theme.spacing.md,
		gap: theme.spacing.xs,
	},
	aboutTitle: {
		...theme.typography.subtitle,
		color: theme.colors.brand,
	},
	aboutVersion: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
	},
	aboutBody: {
		...theme.typography.body,
		color: theme.colors.textPrimary,
	},
})
