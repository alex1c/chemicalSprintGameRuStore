/**
 * Centralized color tokens for Химический спринт.
 * Keep UI free of hard-coded hex values outside this module.
 *
 * Semantic aliases (error/warning/info/…) map to the same palette so
 * components never invent one-off hex values for feedback states.
 */
export const colors = {
	background: '#F3F7F4',
	surface: '#FFFFFF',
	surfaceMuted: '#E7EEE9',
	/** Slightly lifted surface for cards / elevated panels. */
	surfaceElevated: '#FAFCFA',
	textPrimary: '#12241C',
	textSecondary: '#4A6357',
	textInverse: '#F7FBF8',
	brand: '#0B3D2E',
	brandSoft: '#1F6B52',
	accent: '#C45C26',
	accentSoft: '#F2D6C4',
	success: '#1F7A4D',
	successSoft: '#D8F0E3',
	danger: '#B42318',
	dangerSoft: '#F8D7D4',
	/** Semantic aliases — prefer these for feedback UX. */
	error: '#B42318',
	errorSoft: '#F8D7D4',
	warning: '#C45C26',
	warningSoft: '#F2D6C4',
	info: '#1F6B52',
	infoSoft: '#D8F0E3',
	disabled: '#9BB0A4',
	disabledSoft: '#E7EEE9',
	border: '#C9D7CF',
	overlay: 'rgba(18, 36, 28, 0.45)',
	progressTrack: '#D5E3DB',
	progressFill: '#1F6B52',
	/** Mastery markers — readable, not rainbow. */
	masteryUnseen: '#9BB0A4',
	masteryLearning: '#C45C26',
	masteryFamiliar: '#1F6B52',
	masteryMastered: '#0B3D2E',
} as const

export type ColorToken = keyof typeof colors
