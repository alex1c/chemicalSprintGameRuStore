import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { MIN_TOUCH_TARGET } from '../constants/gameplay'
import { ROUTES } from '../constants/routes'
import { ONBOARDING_STEPS } from '../onboarding'
import type { RootStackParamList } from '../navigation/types'
import { setOnboardingCompleted } from '../stats'
import { theme } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>

/**
 * Light first-run (or manually reopened) 3-step onboarding with icon block + dots.
 */
export function OnboardingScreen({ navigation, route }: Props) {
	const manual = route.params?.manual === true
	const [index, setIndex] = useState(0)
	const step = ONBOARDING_STEPS[index]!
	const isLast = index >= ONBOARDING_STEPS.length - 1

	const finish = async () => {
		if (!manual) {
			await setOnboardingCompleted(true)
		}
		navigation.reset({
			index: 0,
			routes: [{ name: ROUTES.Home }],
		})
	}

	const handleNext = () => {
		if (isLast) {
			void finish()
			return
		}
		setIndex((value) => value + 1)
	}

	return (
		<Screen edges={['top', 'left', 'right', 'bottom']}>
			<View style={styles.topRow}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Пропустить вводное обучение"
					onPress={() => {
						void finish()
					}}
					style={({ pressed }) => [
						styles.skip,
						pressed ? styles.skipPressed : null,
					]}
				>
					<Text style={styles.skipText}>ПРОПУСТИТЬ</Text>
				</Pressable>
			</View>

			<View style={styles.content}>
				<View style={styles.iconBlock}>
					<View style={styles.iconRing}>
						<Text style={styles.emoji}>{step.emoji}</Text>
					</View>
					<View style={styles.orbitDot} />
					<View style={[styles.orbitDot, styles.orbitDotAlt]} />
				</View>
				<Text style={styles.title}>{step.titleRu}</Text>
				<Text style={styles.body}>{step.bodyRu}</Text>
			</View>

			<View style={styles.dots}>
				{ONBOARDING_STEPS.map((item, dotIndex) => (
					<View
						key={item.id}
						style={[
							styles.dot,
							dotIndex === index ? styles.dotActive : null,
						]}
					/>
				))}
			</View>

			<PrimaryButton
				label={isLast ? 'НАЧАТЬ' : 'ДАЛЕЕ'}
				accessibilityLabel={isLast ? 'Начать игру' : 'Следующий шаг'}
				onPress={handleNext}
			/>
		</Screen>
	)
}

const styles = StyleSheet.create({
	topRow: {
		alignItems: 'flex-end',
		minHeight: MIN_TOUCH_TARGET,
		justifyContent: 'center',
	},
	skip: {
		minHeight: MIN_TOUCH_TARGET,
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.sm,
	},
	skipPressed: {
		opacity: 0.7,
	},
	skipText: {
		...theme.typography.caption,
		color: theme.colors.textSecondary,
		fontWeight: '700',
	},
	content: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: theme.spacing.md,
	},
	iconBlock: {
		width: 140,
		height: 140,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: theme.spacing.lg,
	},
	iconRing: {
		width: 112,
		height: 112,
		borderRadius: 56,
		backgroundColor: theme.colors.surfaceElevated,
		borderWidth: 2,
		borderColor: theme.colors.brandSoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	orbitDot: {
		position: 'absolute',
		top: 8,
		right: 18,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: theme.colors.accent,
	},
	orbitDotAlt: {
		top: undefined,
		right: undefined,
		bottom: 14,
		left: 16,
		backgroundColor: theme.colors.success,
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	emoji: {
		fontSize: 48,
	},
	title: {
		...theme.typography.display,
		color: theme.colors.brand,
		textAlign: 'center',
		marginBottom: theme.spacing.md,
	},
	body: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
	},
	dots: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.lg,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: theme.colors.border,
	},
	dotActive: {
		backgroundColor: theme.colors.brand,
		width: 18,
	},
})
