import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme'

interface GameProgressProps {
	current: number
	total: number
}

/**
 * Compact progress bar for remaining Classic Sprint questions.
 */
export function GameProgress({ current, total }: GameProgressProps) {
	const ratio = total <= 0 ? 0 : Math.min(Math.max(current / total, 0), 1)

	return (
		<View
			accessibilityRole="progressbar"
			accessibilityValue={{
				min: 0,
				max: total,
				now: current,
			}}
			style={styles.track}
		>
			<View style={[styles.fill, { width: `${ratio * 100}%` }]} />
		</View>
	)
}

const styles = StyleSheet.create({
	track: {
		height: 8,
		borderRadius: theme.radius.pill,
		backgroundColor: theme.colors.progressTrack,
		overflow: 'hidden',
	},
	fill: {
		height: '100%',
		backgroundColor: theme.colors.progressFill,
		borderRadius: theme.radius.pill,
	},
})
