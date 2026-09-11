import {
	CLASSIFICATION_LABELS_RU,
	ELEMENTS,
	getElementByAtomicNumber,
} from '../../src/data/chemistry'
import {
	QUESTION_TYPES,
	answerCurrentQuestion,
	createGameSession,
	createSeededRng,
	evaluateAnswer,
	generateQuestion,
	generateQuestionSet,
	getSessionStats,
	type QuestionType,
} from '../../src/game'

function expectCommonChoiceInvariants(
	question: ReturnType<typeof generateQuestion>,
) {
	const expectedCount = question.type === 'ELEMENT_TO_CLASSIFICATION' ? 3 : 4
	expect(question.choices).toHaveLength(expectedCount)
	expect(new Set(question.choices).size).toBe(expectedCount)
	expect(question.choices).toContain(question.correctAnswer)
	const correctHits = question.choices.filter(
		(choice) => choice === question.correctAnswer,
	)
	expect(correctHits).toHaveLength(1)
}

describe('quiz game engine', () => {
	it('generates each question type', () => {
		const rng = createSeededRng(42)
		for (const type of QUESTION_TYPES) {
			const question = generateQuestion({ rng, type })
			expect(question.type).toBe(type)
			expect(question.prompt.length).toBeGreaterThan(0)
			expectCommonChoiceInvariants(question)
		}
	})

	it('never selects elements without group for NAME_TO_GROUP', () => {
		const rng = createSeededRng(99)
		for (let i = 0; i < 80; i += 1) {
			const question = generateQuestion({ rng, type: 'NAME_TO_GROUP' })
			const element = getElementByAtomicNumber(question.elementAtomicNumber)
			expect(element).toBeDefined()
			expect(element!.group).not.toBeNull()
			expect(question.correctAnswer).toBe(String(element!.group))
		}
	})

	it('uses only valid classification labels', () => {
		const rng = createSeededRng(7)
		const allowed = new Set(Object.values(CLASSIFICATION_LABELS_RU))
		for (let i = 0; i < 40; i += 1) {
			const question = generateQuestion({
				rng,
				type: 'ELEMENT_TO_CLASSIFICATION',
			})
			for (const choice of question.choices) {
				expect(allowed.has(choice)).toBe(true)
			}
		}
	})

	it('evaluates correct and incorrect answers', () => {
		const question = generateQuestion({
			rng: createSeededRng(1),
			type: 'NAME_TO_SYMBOL',
		})
		const ok = evaluateAnswer(question, question.correctAnswer)
		expect(ok.correct).toBe(true)
		expect(ok.selectedAnswer).toBe(question.correctAnswer)

		const wrongChoice =
			question.choices.find((c) => c !== question.correctAnswer) ?? '___'
		const bad = evaluateAnswer(question, wrongChoice)
		expect(bad.correct).toBe(false)
		expect(bad.correctAnswer).toBe(question.correctAnswer)
	})

	it('tracks streak, best streak, accuracy and completes 10-question session', () => {
		const session0 = createGameSession({
			seed: 1234,
			questionCount: 10,
		})
		expect(session0.questions).toHaveLength(10)

		let session = session0
		// Correct, correct, wrong, correct
		session = answerCurrentQuestion(session, session.questions[0]!.correctAnswer)
		expect(session.currentStreak).toBe(1)
		session = answerCurrentQuestion(session, session.questions[1]!.correctAnswer)
		expect(session.currentStreak).toBe(2)
		expect(session.bestStreak).toBe(2)

		const wrong =
			session.questions[2]!.choices.find(
				(c) => c !== session.questions[2]!.correctAnswer,
			) ?? 'x'
		session = answerCurrentQuestion(session, wrong)
		expect(session.currentStreak).toBe(0)
		expect(session.bestStreak).toBe(2)

		session = answerCurrentQuestion(session, session.questions[3]!.correctAnswer)
		expect(session.currentStreak).toBe(1)

		while (!session.isComplete) {
			const q = session.questions[session.currentIndex]!
			session = answerCurrentQuestion(session, q.correctAnswer)
		}

		const stats = getSessionStats(session)
		expect(stats.isComplete).toBe(true)
		expect(stats.answeredCount).toBe(10)
		expect(stats.correctCount + stats.wrongCount).toBe(10)
		expect(stats.accuracy).toBe(stats.correctCount / 10)
		expect(stats.bestStreak).toBeGreaterThanOrEqual(2)
	})

	it('is reproducible with seeded RNG', () => {
		const a = generateQuestionSet(12, createSeededRng(555))
		const b = generateQuestionSet(12, createSeededRng(555))
		expect(a.map((q) => q.prompt)).toEqual(b.map((q) => q.prompt))
		expect(a.map((q) => q.correctAnswer)).toEqual(b.map((q) => q.correctAnswer))
		expect(a.map((q) => q.choices.join('|'))).toEqual(
			b.map((q) => q.choices.join('|')),
		)
	})

	it('stress-generates questions for every type without breaking invariants', () => {
		const rng = createSeededRng(20260911)
		const types = QUESTION_TYPES as readonly QuestionType[]
		for (const type of types) {
			for (let i = 0; i < 200; i += 1) {
				const question = generateQuestion({ rng, type })
				expectCommonChoiceInvariants(question)
				expect(ELEMENTS.some((el) => el.atomicNumber === question.elementAtomicNumber)).toBe(
					true,
				)
			}
		}
	})
})
