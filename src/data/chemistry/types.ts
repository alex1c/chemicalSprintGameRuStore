/**
 * Chemistry classification notes for the local 118-element dataset.
 *
 * Strategy (educational / IUPAC-friendly, consistent for gameplay):
 *
 * Categories:
 * - alkali-metal: group 1 except hydrogen
 * - alkaline-earth-metal: group 2
 * - transition-metal: d-block groups 3–12 (Sc–Zn, Y–Cd, Hf–Hg, Rf–Cn)
 * - post-transition-metal: Al, Ga–Pb/Bi/Po, Nh–Lv
 * - metalloid: B, Si, Ge, As, Sb, Te
 * - nonmetal: H, C, N, O, P, S, Se
 * - halogen: F, Cl, Br, I, At, Ts
 * - noble-gas: He, Ne, Ar, Kr, Xe, Rn, Og
 * - lanthanide: La–Lu (57–71)
 * - actinide: Ac–Lr (89–103)
 *
 * Top-level classification:
 * - metal: alkali, alkaline-earth, transition, post-transition, lanthanide, actinide
 * - nonmetal: nonmetal, halogen, noble-gas
 * - metalloid: metalloid category only
 *
 * Ambiguous decisions (documented):
 * - At is treated as halogen (not metalloid).
 * - Po is treated as post-transition-metal (not metalloid).
 * - Zn, Cd, Hg, Cn stay transition-metal (group 12 educational convention).
 * - La and Ac keep category lanthanide/actinide and group 3.
 * - Ce–Lu and Th–Lr have no IUPAC main-table group (`group: null`).
 * - Nh, Mc, Ts, Og use permanent IUPAC names (not temporary Unun* names).
 */

export type ElementCategory =
	| 'alkali-metal'
	| 'alkaline-earth-metal'
	| 'transition-metal'
	| 'post-transition-metal'
	| 'metalloid'
	| 'nonmetal'
	| 'halogen'
	| 'noble-gas'
	| 'lanthanide'
	| 'actinide'

export type ElementClassification = 'metal' | 'nonmetal' | 'metalloid'

/** IUPAC group 1–18, or null when the element is not assigned in our table scheme. */
export type ElementGroup = number | null

export interface ChemicalElement {
	atomicNumber: number
	symbol: string
	nameRu: string
	nameEn: string
	period: number
	group: ElementGroup
	category: ElementCategory
	classification: ElementClassification
	atomicMass: number
	hintRu: string
}

export const ELEMENT_CATEGORIES: readonly ElementCategory[] = [
	'alkali-metal',
	'alkaline-earth-metal',
	'transition-metal',
	'post-transition-metal',
	'metalloid',
	'nonmetal',
	'halogen',
	'noble-gas',
	'lanthanide',
	'actinide',
] as const

export const ELEMENT_CLASSIFICATIONS: readonly ElementClassification[] = [
	'metal',
	'nonmetal',
	'metalloid',
] as const

export const CLASSIFICATION_LABELS_RU: Record<ElementClassification, string> = {
	metal: 'Металл',
	nonmetal: 'Неметалл',
	metalloid: 'Металлоид',
}
