import { colors } from './colors'
import { spacing } from './spacing'
import { radius } from './radius'
import { typography } from './typography'
import { shadows } from './shadows'
import { motion, STREAK_MILESTONES, isStreakMilestone } from './motion'

export {
	colors,
	spacing,
	radius,
	typography,
	shadows,
	motion,
	STREAK_MILESTONES,
	isStreakMilestone,
}

/**
 * Aggregated theme object for convenient imports.
 */
export const theme = {
	colors,
	spacing,
	radius,
	typography,
	shadows,
	motion,
} as const
