import {
	ELEMENTS,
	type ChemicalElement,
	type ElementCategory,
} from '../data/chemistry'
import type { ElementStatsMap } from '../modes/elementPerformance'
import {
	getElementMastery,
	getElementsByMastery,
	type ProgressFilter,
} from './compute'
import { MASTERY_LABELS_RU } from './config'

/**
 * Localized category labels for element detail UI.
 */
export const CATEGORY_LABELS_RU: Record<ElementCategory, string> = {
	'alkali-metal': 'Щелочной металл',
	'alkaline-earth-metal': 'Щёлочноземельный металл',
	'transition-metal': 'Переходный металл',
	'post-transition-metal': 'Постпереходный металл',
	metalloid: 'Металлоид',
	nonmetal: 'Неметалл',
	halogen: 'Галоген',
	'noble-gas': 'Благородный газ',
	lanthanide: 'Лантаноид',
	actinide: 'Актиноид',
}

export function getCategoryLabelRu(category: ElementCategory): string {
	return CATEGORY_LABELS_RU[category]
}

/** Compact group display — never show raw null. */
export function formatGroupLabel(group: number | null): string {
	return group === null ? '—' : String(group)
}

/**
 * Short relative / absolute last-seen label without a date library.
 */
export function formatLastSeenLabel(
	lastSeenAt: string | null,
	nowMs: number = Date.now(),
): string {
	if (!lastSeenAt) {
		return 'Ещё не тренировался'
	}
	const then = Date.parse(lastSeenAt)
	if (!Number.isFinite(then)) {
		return 'Ещё не тренировался'
	}
	const dayMs = 86_400_000
	const startToday = new Date(nowMs)
	startToday.setHours(0, 0, 0, 0)
	const startThen = new Date(then)
	startThen.setHours(0, 0, 0, 0)
	const dayDiff = Math.round(
		(startToday.getTime() - startThen.getTime()) / dayMs,
	)
	if (dayDiff <= 0) {
		return 'Сегодня'
	}
	if (dayDiff === 1) {
		return 'Вчера'
	}
	const d = new Date(then)
	const dd = String(d.getDate()).padStart(2, '0')
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const yyyy = d.getFullYear()
	return `${dd}.${mm}.${yyyy}`
}

/**
 * Local search across symbol, Russian name, and atomic number.
 * Case-insensitive; empty query returns the input set unchanged.
 */
export function searchElements(
	atomicNumbers: readonly number[],
	query: string,
	catalog: readonly ChemicalElement[] = ELEMENTS,
): number[] {
	const trimmed = query.trim()
	if (trimmed.length === 0) {
		return [...atomicNumbers]
	}
	const needle = trimmed.toLocaleLowerCase('ru-RU')
	const byNumber = new Map(
		catalog.map((el) => [el.atomicNumber, el] as const),
	)

	return atomicNumbers.filter((atomic) => {
		const el = byNumber.get(atomic)
		if (!el) {
			return false
		}
		if (String(el.atomicNumber) === trimmed) {
			return true
		}
		if (el.symbol.toLocaleLowerCase('ru-RU') === needle) {
			return true
		}
		if (el.symbol.toLocaleLowerCase('ru-RU').includes(needle)) {
			return true
		}
		if (el.nameRu.toLocaleLowerCase('ru-RU').includes(needle)) {
			return true
		}
		if (el.nameEn.toLocaleLowerCase('en-US').includes(needle)) {
			return true
		}
		return false
	})
}

/**
 * Combine filter + search for the Progress grid.
 */
export function filterAndSearchElements(
	elementStats: ElementStatsMap,
	filter: ProgressFilter,
	query: string,
	totalElements: number = 118,
): number[] {
	const filtered = getElementsByMastery(elementStats, filter, totalElements)
	return searchElements(filtered, query)
}

/** Accessible tile label for an element cell. */
export function getElementTileAccessibilityLabel(
	element: ChemicalElement,
	elementStats: ElementStatsMap,
): string {
	const mastery = getElementMastery(elementStats[String(element.atomicNumber)])
	return `${element.symbol}, ${element.nameRu}, ${MASTERY_LABELS_RU[mastery]}`
}
