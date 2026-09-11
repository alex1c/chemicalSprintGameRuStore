import {
	ELEMENTS,
	ELEMENT_CATEGORIES,
	ELEMENT_CLASSIFICATIONS,
	ELEMENTS_BY_SYMBOL,
	type ElementCategory,
	type ElementClassification,
} from '../../src/data/chemistry'

describe('chemistry dataset integrity', () => {
	it('contains exactly 118 elements', () => {
		expect(ELEMENTS).toHaveLength(118)
	})

	it('has unique atomic numbers covering 1..118 without gaps', () => {
		const numbers = ELEMENTS.map((el) => el.atomicNumber).sort((a, b) => a - b)
		expect(new Set(numbers).size).toBe(118)
		expect(numbers[0]).toBe(1)
		expect(numbers[117]).toBe(118)
		for (let i = 0; i < 118; i += 1) {
			expect(numbers[i]).toBe(i + 1)
		}
	})

	it('has unique non-empty symbols', () => {
		const symbols = ELEMENTS.map((el) => el.symbol)
		expect(new Set(symbols).size).toBe(118)
		for (const symbol of symbols) {
			expect(symbol.trim().length).toBeGreaterThan(0)
		}
	})

	it('has non-empty Russian and English names', () => {
		for (const el of ELEMENTS) {
			expect(el.nameRu.trim().length).toBeGreaterThan(0)
			expect(el.nameEn.trim().length).toBeGreaterThan(0)
		}
	})

	it('has valid periods', () => {
		for (const el of ELEMENTS) {
			expect(el.period).toBeGreaterThanOrEqual(1)
			expect(el.period).toBeLessThanOrEqual(7)
		}
	})

	it('has group 1..18 or explicit null', () => {
		for (const el of ELEMENTS) {
			if (el.group === null) {
				continue
			}
			expect(el.group).toBeGreaterThanOrEqual(1)
			expect(el.group).toBeLessThanOrEqual(18)
		}
	})

	it('uses only allowed classification and category values', () => {
		const categories = new Set<ElementCategory>(ELEMENT_CATEGORIES)
		const classifications = new Set<ElementClassification>(ELEMENT_CLASSIFICATIONS)

		for (const el of ELEMENTS) {
			expect(categories.has(el.category)).toBe(true)
			expect(classifications.has(el.classification)).toBe(true)
		}
	})

	it('has valid atomicMass and non-empty hintRu', () => {
		for (const el of ELEMENTS) {
			expect(Number.isFinite(el.atomicMass)).toBe(true)
			expect(el.atomicMass).toBeGreaterThan(0)
			expect(el.hintRu.trim().length).toBeGreaterThan(0)
		}
	})

	it('matches regression fixtures for key elements', () => {
		const expectElement = (
			symbol: string,
			partial: {
				atomicNumber: number
				nameRu: string
				nameEn: string
				group: number | null
				category: ElementCategory
				classification: ElementClassification
			},
		) => {
			const el = ELEMENTS_BY_SYMBOL.get(symbol)
			expect(el).toBeDefined()
			expect(el!.atomicNumber).toBe(partial.atomicNumber)
			expect(el!.nameRu).toBe(partial.nameRu)
			expect(el!.nameEn).toBe(partial.nameEn)
			expect(el!.group).toBe(partial.group)
			expect(el!.category).toBe(partial.category)
			expect(el!.classification).toBe(partial.classification)
		}

		expectElement('H', {
			atomicNumber: 1,
			nameRu: 'Водород',
			nameEn: 'Hydrogen',
			group: 1,
			category: 'nonmetal',
			classification: 'nonmetal',
		})
		expectElement('C', {
			atomicNumber: 6,
			nameRu: 'Углерод',
			nameEn: 'Carbon',
			group: 14,
			category: 'nonmetal',
			classification: 'nonmetal',
		})
		expectElement('O', {
			atomicNumber: 8,
			nameRu: 'Кислород',
			nameEn: 'Oxygen',
			group: 16,
			category: 'nonmetal',
			classification: 'nonmetal',
		})
		expectElement('Na', {
			atomicNumber: 11,
			nameRu: 'Натрий',
			nameEn: 'Sodium',
			group: 1,
			category: 'alkali-metal',
			classification: 'metal',
		})
		expectElement('Fe', {
			atomicNumber: 26,
			nameRu: 'Железо',
			nameEn: 'Iron',
			group: 8,
			category: 'transition-metal',
			classification: 'metal',
		})
		expectElement('Cu', {
			atomicNumber: 29,
			nameRu: 'Медь',
			nameEn: 'Copper',
			group: 11,
			category: 'transition-metal',
			classification: 'metal',
		})
		expectElement('Ag', {
			atomicNumber: 47,
			nameRu: 'Серебро',
			nameEn: 'Silver',
			group: 11,
			category: 'transition-metal',
			classification: 'metal',
		})
		expectElement('Au', {
			atomicNumber: 79,
			nameRu: 'Золото',
			nameEn: 'Gold',
			group: 11,
			category: 'transition-metal',
			classification: 'metal',
		})
		expectElement('Hg', {
			atomicNumber: 80,
			nameRu: 'Ртуть',
			nameEn: 'Mercury',
			group: 12,
			category: 'transition-metal',
			classification: 'metal',
		})
		expectElement('Pb', {
			atomicNumber: 82,
			nameRu: 'Свинец',
			nameEn: 'Lead',
			group: 14,
			category: 'post-transition-metal',
			classification: 'metal',
		})
		expectElement('U', {
			atomicNumber: 92,
			nameRu: 'Уран',
			nameEn: 'Uranium',
			group: null,
			category: 'actinide',
			classification: 'metal',
		})
		expectElement('Nh', {
			atomicNumber: 113,
			nameRu: 'Нихоний',
			nameEn: 'Nihonium',
			group: 13,
			category: 'post-transition-metal',
			classification: 'metal',
		})
		expectElement('Mc', {
			atomicNumber: 115,
			nameRu: 'Московий',
			nameEn: 'Moscovium',
			group: 15,
			category: 'post-transition-metal',
			classification: 'metal',
		})
		expectElement('Ts', {
			atomicNumber: 117,
			nameRu: 'Теннессин',
			nameEn: 'Tennessine',
			group: 17,
			category: 'halogen',
			classification: 'nonmetal',
		})
		expectElement('Og', {
			atomicNumber: 118,
			nameRu: 'Оганесон',
			nameEn: 'Oganesson',
			group: 18,
			category: 'noble-gas',
			classification: 'nonmetal',
		})
	})

	it('does not use temporary Unun* names', () => {
		for (const el of ELEMENTS) {
			expect(el.nameEn.toLowerCase().startsWith('unun')).toBe(false)
			expect(el.nameRu.toLowerCase().includes('унун')).toBe(false)
		}
	})

	it('keeps classification mapping and f-block group model consistent', () => {
		const metalCategories = new Set([
			'alkali-metal',
			'alkaline-earth-metal',
			'transition-metal',
			'post-transition-metal',
			'lanthanide',
			'actinide',
		])
		for (const el of ELEMENTS) {
			expect(el.classification).toBe(
				metalCategories.has(el.category)
					? 'metal'
					: el.category === 'metalloid'
						? 'metalloid'
						: 'nonmetal',
			)
		}
		for (const el of ELEMENTS) {
			if ((el.atomicNumber >= 58 && el.atomicNumber <= 71) ||
				(el.atomicNumber >= 90 && el.atomicNumber <= 103)) {
				expect(el.group).toBeNull()
			}
		}
		expect(ELEMENTS.find((el) => el.symbol === 'La')!.group).toBe(3)
		expect(ELEMENTS.find((el) => el.symbol === 'Ac')!.group).toBe(3)
	})
})
