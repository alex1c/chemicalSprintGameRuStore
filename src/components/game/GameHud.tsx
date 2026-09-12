import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { isStreakMilestone, theme } from '../../theme'

interface GameHudProps {
	questionNumber: number
	questionCount: number
	streak: number
	score: number
	scoreDelta?: number
}

/**
 * Compact top HUD: progress index, streak pulse, and score with float delta.
 */
export function GameHud({
	questionNumber,
	questionCount,
	streak,
	score,
	scoreDelta = 0,
}: GameHudProps) {
	const reduceMotion = useReducedMotion()
	const streakScale = useRef(new Animated.Value(1)).current
	const deltaOpacity = useRef(new Animated.Value(0)).current
	const deltaTranslate = useRef(new Animated.Value(0)).current

	useEffect(() => {
		if (streak <= 0 || reduceMotion) {
			return
		}
		const milestone = isStreakMilestone(streak)
		const out = milestone
			? theme.motion.streakMilestoneOut
			: theme.motion.streakPulseOut
		const back = milestone
			? theme.motion.streakMilestoneIn
			: theme.motion.streakPulseIn
		const peak = milestone ? 1.28 : 1.16

		streakScale.setValue(1)
		Animated.sequence([
			Animated.timing(streakScale, {
				toValue: peak,
				duration: out,
				useNativeDriver: true,
			}),
			Animated.timing(streakScale, {
				toValue: 1,
				duration: back,
				useNativeDriver: true,
			}),
		]).start()
	}, [streak, reduceMotion, streakScale])

	useEffect(() => {
		deltaOpacity.stopAnimation()
		deltaTranslate.stopAnimation()

		if (scoreDelta <= 0) {
			deltaOpacity.setValue(0)
			deltaTranslate.setValue(0)
			return
		}

		if (reduceMotion) {
			deltaOpacity.setValue(1)
			deltaTranslate.setValue(0)
			return
		}

		deltaOpacity.setValue(0)
		deltaTranslate.setValue(8)
		Animated.parallel([
			Animated.timing(deltaOpacity, {
				toValue: 1,
				duration: theme.motion.fast,
				useNativeDriver: true,
			}),
			Animated.timing(deltaTranslate, {
				toValue: -6,
				duration: theme.motion.scoreFloatDuration,
				useNativeDriver: true,
			}),
		]).start()
	}, [scoreDelta, reduceMotion, deltaOpacity, deltaTranslate])

	return (
		<View style={styles.row}>
			<Text style={styles.item}>
				{questionNumber} / {questionCount}
			</Text>
			<Animated.Text
				style={[
					styles.item,
					styles.streak,
					{ transform: [{ scale: streakScale }] },
				]}
			>
				🔥 {streak}
			</Animated.Text>
			<View style={styles.scoreBlock}>
				<Text style={styles.item}>Очки: {score}</Text>
				{scoreDelta > 0 ? (
					<Animated.Text
						style={[
							styles.delta,
							{
								opacity: deltaOpacity,
								transform: [{ translateY: deltaTranslate }],
							},
						]}
					>
						+{scoreDelta}
					</Animated.Text>
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
		flex: 1,
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
		minWidth: 72,
	},
	delta: {
		...theme.typography.caption,
		color: theme.colors.success,
		fontWeight: '700',
	},
})
