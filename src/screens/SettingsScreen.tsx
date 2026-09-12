import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Screen } from '../components/Screen'
import { APP_DISPLAY_NAME, APP_VERSION } from '../constants/app'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { ROUTES } from '../constants/routes'
import type { RootStackParamList } from '../navigation/types'
import { loadAppSettings, updateAppSettings } from '../stats'
import { DEFAULT_SETTINGS, type AppSettings } from '../storage'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

/**
 * Settings: real haptics toggle, replay onboarding, about/version.
 * Sound toggle intentionally omitted until a sound pack exists.
 */
export function SettingsScreen({ navigation }: Props) {
	const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
	const [ready, setReady] = useState(false)

	const refresh = useCallback(async () => {
		const next = await loadAppSettings()
		setSettings(next)
		setReady(true)
	}, [])

	useFocusEffect(
		useCallback(() => {
			void refresh()
		}, [refresh]),
	)

	useEffect(() => {
		void refresh()
	}, [refresh])

	const handleHapticsToggle = async (value: boolean) => {
		setSettings((prev) => ({ ...prev, hapticsEnabled: value }))
		const next = await updateAppSettings({ hapticsEnabled: value })
		setSettings(next)
	}

	return (
		<Screen edges={['left', 'right', 'bottom']}>
			<Text style={styles.section}>Отклик</Text>
			<View style={styles.toggleRow}>
				<View style={styles.toggleCopy}>
					<Text style={styles.rowTitle}>Тактильный отклик</Text>
					<Text style={styles.rowHint}>
						Короткая вибрация при ответах, подсказках и наградах
					</Text>
				</View>
				<Switch
					accessibilityLabel="Тактильный отклик"
					value={ready ? settings.hapticsEnabled : true}
					onValueChange={(value) => {
						void handleHapticsToggle(value)
					}}
					trackColor={{
						false: theme.colors.disabled,
						true: theme.colors.brandSoft,
					}}
					thumbColor={theme.colors.surface}
				/>
			</View>

			<Text style={styles.section}>Обучение</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Пройти вводное обучение снова"
				onPress={() =>
					navigation.navigate(ROUTES.Onboarding, { manual: true })
				}
				style={({ pressed }) => [
					styles.row,
					pressed ? styles.rowPressed : null,
				]}
			>
				<Text style={styles.rowTitle}>Пройти вводное обучение снова</Text>
				<Text style={styles.rowHint}>
					Откроет 3 коротких шага без сброса прогресса
				</Text>
			</Pressable>

			<Text style={styles.section}>Конфиденциальность</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Открыть сведения о конфиденциальности"
				onPress={() => navigation.navigate(ROUTES.Privacy)}
				style={({ pressed }) => [
					styles.row,
					pressed ? styles.rowPressed : null,
				]}
			>
				<Text style={styles.rowTitle}>Конфиденциальность</Text>
				<Text style={styles.rowHint}>
					Локальный прогресс, реклама Яндекса, аналитика
				</Text>
			</Pressable>

			<Text style={styles.section}>Реклама</Text>
			<View style={styles.about}>
				<Text style={styles.aboutBody}>
					В приложении используется реклама Яндекса (баннеры, редкий
					межстраничный показ и добровольное rewarded-видео за атомы).
				</Text>
			</View>

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
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: theme.spacing.md,
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		padding: theme.spacing.md,
		minHeight: MIN_TOUCH_TARGET + 12,
		marginBottom: theme.spacing.md,
	},
	toggleCopy: {
		flex: 1,
		gap: 2,
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
	rowPressed: {
		backgroundColor: theme.colors.surfaceMuted,
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
		lineHeight: 22,
	},
})
