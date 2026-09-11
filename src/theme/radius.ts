/**
 * Border radius tokens for buttons, panels, and chips.
 */
export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	pill: 999,
} as const

export type RadiusToken = keyof typeof radius
