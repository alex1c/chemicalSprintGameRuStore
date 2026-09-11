/**
 * Centralized color tokens for Химический спринт.
 * Keep UI free of hard-coded hex values outside this module.
 */
export const colors = {
	background: '#F3F7F4',
	surface: '#FFFFFF',
	surfaceMuted: '#E7EEE9',
	textPrimary: '#12241C',
	textSecondary: '#4A6357',
	textInverse: '#F7FBF8',
	brand: '#0B3D2E',
	brandSoft: '#1F6B52',
	accent: '#C45C26',
	accentSoft: '#F2D6C4',
	success: '#1F7A4D',
	danger: '#B42318',
	border: '#C9D7CF',
	overlay: 'rgba(18, 36, 28, 0.45)',
} as const

export type ColorToken = keyof typeof colors
