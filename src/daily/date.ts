/**
 * Daily Sprint calendar helpers — local device calendar dates only (not UTC).
 */

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export type LocalDateParts = {
	year: number
	month: number
	day: number
}

/**
 * Format a Date as YYYY-MM-DD using the device's local calendar fields.
 */
export function getLocalDateKey(date: Date = new Date()): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

/**
 * Parse a date key into local calendar parts. Returns null when invalid.
 */
export function parseLocalDateKey(dateKey: string): LocalDateParts | null {
	const match = DATE_KEY_PATTERN.exec(dateKey)
	if (!match) {
		return null
	}
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (!isValidCalendarDay(year, month, day)) {
		return null
	}
	return { year, month, day }
}

export function isValidDateKey(dateKey: string): boolean {
	return parseLocalDateKey(dateKey) !== null
}

/**
 * True when year/month/day form a real Gregorian calendar day.
 */
export function isValidCalendarDay(
	year: number,
	month: number,
	day: number,
): boolean {
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	) {
		return false
	}
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return false
	}
	// Construct in local time and verify components round-trip (rejects 2026-02-30).
	const probe = new Date(year, month - 1, day)
	return (
		probe.getFullYear() === year &&
		probe.getMonth() === month - 1 &&
		probe.getDate() === day
	)
}

/**
 * Calendar-day difference aKey - bKey (positive when a is after b).
 * Uses noon local to avoid DST edge ambiguity around midnight.
 */
export function differenceInLocalCalendarDays(
	aKey: string,
	bKey: string,
): number {
	const a = parseLocalDateKey(aKey)
	const b = parseLocalDateKey(bKey)
	if (!a || !b) {
		throw new Error(`Invalid date key for difference: ${aKey} / ${bKey}`)
	}
	const aMs = new Date(a.year, a.month - 1, a.day, 12, 0, 0, 0).getTime()
	const bMs = new Date(b.year, b.month - 1, b.day, 12, 0, 0, 0).getTime()
	return Math.round((aMs - bMs) / 86_400_000)
}

/** Previous local calendar date key (handles month/year boundaries). */
export function getPreviousDateKey(dateKey: string): string {
	const parts = parseLocalDateKey(dateKey)
	if (!parts) {
		throw new Error(`Invalid date key: ${dateKey}`)
	}
	const previous = new Date(parts.year, parts.month - 1, parts.day - 1)
	return getLocalDateKey(previous)
}
