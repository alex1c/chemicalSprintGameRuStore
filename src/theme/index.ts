import { colors } from './colors'
import { spacing } from './spacing'
import { radius } from './radius'
import { typography } from './typography'
import { shadows } from './shadows'

export { colors, spacing, radius, typography, shadows }

/**
 * Aggregated theme object for convenient imports.
 */
export const theme = {
	colors,
	spacing,
	radius,
	typography,
	shadows,
} as const
