import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Screen } from '../components/Screen'
import { APP_DISPLAY_NAME } from '../constants/app'
import type { RootStackParamList } from '../navigation/types'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>

/**
 * Local privacy disclosure (Yandex Ads + AppMetrica).
 */
export function PrivacyScreen(_props: Props) {
	return (
		<Screen edges={['left', 'right', 'bottom']}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.title}>Конфиденциальность</Text>
				<Text style={styles.body}>
					{APP_DISPLAY_NAME} — образовательная игра общего назначения.
					Аккаунт не требуется: игровой прогресс хранится локально на
					устройстве (рекорды, атомы, достижения, обучение).
				</Text>

				<Text style={styles.section}>Локальные данные</Text>
				<Text style={styles.body}>
					Приложение сохраняет прогресс через локальное хранилище
					устройства. Собственного игрового сервера нет: прогресс не
					отправляется на сервер разработчика.
				</Text>

				<Text style={styles.section}>Реклама</Text>
				<Text style={styles.body}>
					В приложении используется рекламная сеть Яндекса (Yandex
					Mobile Ads / РСЯ). Рекламный SDK может обрабатывать технические
					идентификаторы и данные об устройстве в соответствии с
					политикой Яндекса, чтобы показывать и измерять рекламу.
				</Text>

				<Text style={styles.section}>Аналитика</Text>
				<Text style={styles.body}>
					В приложении используется AppMetrica для технической аналитики,
					оценки стабильности и анализа использования игровых функций
					(например: открытие приложения, старт и завершение режима,
					подсказки, rewarded). Имя, email и аккаунт не собираются.
				</Text>

				<Text style={styles.section}>Что мы не делаем</Text>
				<View style={styles.bullets}>
					<Text style={styles.bullet}>
						• не требуем регистрацию и вход;
					</Text>
					<Text style={styles.bullet}>
						• не запрашиваем контакты, камеру или геолокацию ради игры;
					</Text>
					<Text style={styles.bullet}>
						• не продаём игровой прогресс третьим лицам.
					</Text>
				</View>

				<Text style={styles.footnote}>
					Полный текст политики также подготовлен в документации
					проекта (docs/privacy-policy-ru.md) для будущей публикации.
				</Text>
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: theme.spacing.xxl,
		gap: theme.spacing.sm,
	},
	title: {
		...theme.typography.title,
		color: theme.colors.brand,
		marginBottom: theme.spacing.sm,
	},
	section: {
		...theme.typography.subtitle,
		color: theme.colors.textPrimary,
		marginTop: theme.spacing.md,
	},
	body: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		lineHeight: 24,
	},
	bullets: {
		gap: theme.spacing.xxs,
	},
	bullet: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		lineHeight: 22,
	},
	footnote: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.lg,
		lineHeight: 18,
	},
})
