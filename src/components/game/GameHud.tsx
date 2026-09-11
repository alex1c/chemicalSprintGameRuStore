import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme'

interface GameHudProps {
	questionNumber: number
	questionCount: number
	streak: number
	score: number
	scoreDelta?: number
}

/**
 * Compact top HUD: progress index, streak, and score.
 */
export function GameHud({
	questionNumber,
	questionCount,
	streak,
	score,
	scoreDelta = 0,
}: GameHudProps) {
	const streakScale = useRef(new Animated.Value(1)).current

	useEffect(() => {
		if (streak <= 0) {
			return
		}
		streakScale.setValue(1)
		Animated.sequence([
			Animated.timing(streakScale, {
				toValue: 1.18,
				duration: 120,
				useNativeDriver: true,
			}),
			Animated.timing(streakScale, {
				toValue: 1,
				duration: 140,
				useNativeDriver: true,
			}),
		]).start()
	}, [streak, streakScale])

	return (
		<View style={styles.row}>
			<Text style={styles.item}>
				{questionNumber} / {questionCount}
			</Text>
			<Animated.Text
				style={[styles.item, styles.streak, { transform: [{ scale: streakScale }] }]}
			>
				🔥 {streak}
			</Animated.Text>
			<View style={styles.scoreBlock}>
				<Text style={styles.item}>Очки: {score}</Text>
				{scoreDelta > 0 ? (
					<Text style={styles.delta}>+{scoreDelta}</Text>
				) : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: theme.spacing.sm,
	},
	item: {
		...theme.typography.subtitle,
		fontSize: 16,
		color: theme.colors.textPrimary,
	},
	streak: {
		color: theme.colors.accent,
	},
	scoreBlock: {
		alignItems: 'flex-end',
	},
	delta: {
		...theme.typography.caption,
		color: theme.colors.success,
		fontWeight: '700',
	},
})
