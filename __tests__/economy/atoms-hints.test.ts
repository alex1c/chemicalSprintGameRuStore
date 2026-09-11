import {
	ATOM_ECONOMY_CONFIG,
	HINT_COSTS,
	activateSecondChance,
	applyFactHint,
	applyFiftyFifty,
	applySaveStreak,
	calculateAtomRewards,
	canAfford,
	canOfferSaveStreak,
	createEmptyWallet,
	createStartingWallet,
	earnAtoms,
	getSafeFactHint,
	grantStartingAtoms,
	hintLeaksAnswer,
	pickFiftyFiftyHiddenIndexes,
	spendAtoms,
} from '../../src/economy'
import {
	advanceAfterFeedback,
	answerCurrentQuestion,
	createClassicSprintSession,
	createGameSession,
	createSeededRng,
	submitCurrentAnswer,
} from '../../src/game'
import { ELEMENTS, ELEMENTS_BY_SYMBOL } from '../../src/data/chemistry'
import {
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
	migratePersistedState,
	loadAppState,
	saveAppState,
	type KeyValueStorage,
} from '../../src/storage'
import {
	persistAtomSpend,
	persistCompletedSessionStats,
} from '../../src/stats'

class MemoryStorage implements KeyValueStorage {
	private readonly map = new Map<string, string>()

	async getItem(key: string): Promise<string | null> {
		return this.map.has(key) ? this.map.get(key)! : null
	}

	async setItem(key: string, value: string): Promise<void> {
		this.map.set(key, value)
	}

	async removeItem(key: string): Promise<void> {
		this.map.delete(key)
	}
}

describe('atom wallet', () => {
	it('grants starting atoms once', () => {
		const empty = createEmptyWallet()
		const granted = grantStartingAtoms(empty)
		expect(granted.ok).toBe(true)
		expect(granted.wallet.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
		expect(granted.wallet.startingGranted).toBe(true)

		const again = grantStartingAtoms(granted.wallet)
		expect(again.ok).toBe(false)
		expect(again.wallet.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
	})

	it('earns and spends without going negative', () => {
		let wallet = createStartingWallet(20)
		wallet = earnAtoms(wallet, 5, 'session_reward').wallet
		expect(wallet.balance).toBe(25)

		const spent = spendAtoms(wallet, 8, 'hint_fact')
		expect(spent.ok).toBe(true)
		expect(spent.wallet.balance).toBe(17)

		const blocked = spendAtoms(spent.wallet, 100, 'hint_save_streak')
		expect(blocked.ok).toBe(false)
		expect(blocked.error).toBe('insufficient_balance')
		expect(blocked.wallet.balance).toBe(17)
		expect(canAfford(blocked.wallet, 100)).toBe(false)
	})

	it('rejects invalid spend amounts', () => {
		const wallet = createStartingWallet(10)
		for (const amount of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
			expect(spendAtoms(wallet, amount, 'hint_fact').ok).toBe(false)
		}
		expect(wallet.balance).toBe(10)
	})

	it('rejects invalid earn amounts', () => {
		const wallet = createStartingWallet(10)
		for (const amount of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
			expect(earnAtoms(wallet, amount, 'session_reward').ok).toBe(false)
		}
	})
})

describe('atom rewards', () => {
	it('calculates correct / streak / completion / perfect / record bonuses', () => {
		const rewards = calculateAtomRewards({
			correctCount: 10,
			wrongCount: 0,
			questionCount: 10,
			bestStreak: 10,
			isNewBestScore: true,
		})
		expect(rewards.baseCorrect).toBe(10 * ATOM_ECONOMY_CONFIG.correctAnswer)
		expect(rewards.streakBonuses).toBe(ATOM_ECONOMY_CONFIG.streak10Bonus)
		expect(rewards.completion).toBe(ATOM_ECONOMY_CONFIG.gameCompletedBonus)
		expect(rewards.perfect).toBe(ATOM_ECONOMY_CONFIG.perfectGameBonus)
		expect(rewards.newRecord).toBe(ATOM_ECONOMY_CONFIG.newBestScoreBonus)
		expect(rewards.total).toBe(
			rewards.baseCorrect +
				rewards.streakBonuses +
				rewards.completion +
				rewards.perfect +
				rewards.newRecord,
		)
	})

	it('uses streak5 bonus when streak is 5–9', () => {
		const rewards = calculateAtomRewards({
			correctCount: 5,
			wrongCount: 5,
			questionCount: 10,
			bestStreak: 5,
			isNewBestScore: false,
		})
		expect(rewards.streakBonuses).toBe(ATOM_ECONOMY_CONFIG.streak5Bonus)
		expect(rewards.perfect).toBe(0)
		expect(rewards.newRecord).toBe(0)
	})

	it('does not reward wrong answers in baseCorrect', () => {
		const rewards = calculateAtomRewards({
			correctCount: 3,
			wrongCount: 7,
			questionCount: 10,
			bestStreak: 2,
			isNewBestScore: false,
		})
		expect(rewards.baseCorrect).toBe(3)
	})
})

describe('50/50 hint', () => {
	it('hides 2 wrong choices for 4-choice questions', () => {
		const indexes = pickFiftyFiftyHiddenIndexes(
			['A', 'B', 'C', 'D'],
			'B',
			createSeededRng(1),
		)
		expect(indexes).toHaveLength(2)
		expect(indexes.includes(1)).toBe(false)
	})

	it('hides 1 wrong choice for 3-choice questions', () => {
		const indexes = pickFiftyFiftyHiddenIndexes(
			['Металл', 'Неметалл', 'Металлоид'],
			'Металл',
			createSeededRng(2),
		)
		expect(indexes).toHaveLength(1)
		expect(indexes[0]).not.toBe(0)
	})

	it('spends once and cannot be reused', () => {
		let session = createGameSession({ seed: 11, questionCount: 1 })
		// Force a 4-choice question if needed by regenerating until found.
		session = createClassicSprintSession({ seed: 99 })
		const fourChoiceIndex = session.questions.findIndex(
			(q) => q.choices.length === 4,
		)
		expect(fourChoiceIndex).toBeGreaterThanOrEqual(0)
		session = {
			...session,
			currentIndex: fourChoiceIndex,
		}

		const wallet = createStartingWallet(50)
		const first = applyFiftyFifty(session, wallet, createSeededRng(3))
		expect(first.ok).toBe(true)
		if (!first.ok) {
			return
		}
		expect(first.cost).toBe(HINT_COSTS.fiftyFifty)
		expect(first.session.extensions.hintState.fiftyFiftyUsed).toBe(true)
		expect(
			first.session.extensions.hintState.hiddenChoiceIndexes,
		).toHaveLength(2)

		const second = applyFiftyFifty(first.session, wallet, createSeededRng(4))
		expect(second.ok).toBe(false)
		if (!second.ok) {
			expect(second.error).toBe('already_used')
		}
	})
})

describe('fact hint', () => {
	it('sanitizes leaking hints', () => {
		const sodium = ELEMENTS_BY_SYMBOL.get('Na')!
		expect(
			hintLeaksAnswer(
				'Символ Na связан с Natrium',
				'NAME_TO_SYMBOL',
				sodium,
				'Na',
			),
		).toBe(true)

		const safe = getSafeFactHint(sodium, 'NAME_TO_SYMBOL', 'Na')
		expect(safe.toLowerCase().includes(' na')).toBe(false)
		expect(safe.toLowerCase().includes('натрий')).toBe(false)
	})

	it('spends and cannot be reused; blocks insufficient balance', () => {
		const session = createClassicSprintSession({ seed: 5 })
		const rich = createStartingWallet(20)
		const applied = applyFactHint(session, rich)
		expect(applied.ok).toBe(true)
		if (!applied.ok) {
			return
		}
		expect(applied.session.extensions.hintState.factText).toBeTruthy()
		const again = applyFactHint(applied.session, rich)
		expect(again.ok).toBe(false)

		const poor = createStartingWallet(2)
		const denied = applyFactHint(session, poor)
		expect(denied.ok).toBe(false)
		if (!denied.ok) {
			expect(denied.error).toBe('insufficient_balance')
		}
	})

	it('does not leak the answer for any element/question type', () => {
		expect(ELEMENTS).toHaveLength(118)
		for (const element of ELEMENTS) {
			for (const type of [
				'NAME_TO_SYMBOL',
				'SYMBOL_TO_NAME',
				'NAME_TO_ATOMIC_NUMBER',
				'ATOMIC_NUMBER_TO_NAME',
				'NAME_TO_GROUP',
				'ELEMENT_TO_CLASSIFICATION',
			] as const) {
				if (type === 'NAME_TO_GROUP' && element.group === null) continue
				const correct =
					type === 'NAME_TO_SYMBOL'
						? element.symbol
						: type === 'SYMBOL_TO_NAME' || type === 'ATOMIC_NUMBER_TO_NAME'
							? element.nameRu
							: type === 'NAME_TO_ATOMIC_NUMBER'
								? String(element.atomicNumber)
								: type === 'NAME_TO_GROUP'
									? String(element.group)
									: element.category
				const hint = getSafeFactHint(element, type, correct)
				expect(hintLeaksAnswer(hint, type, element, correct)).toBe(false)
			}
		}
	})
})

describe('second chance', () => {
	it('keeps streak and question open after first wrong', () => {
		let session = createGameSession({ seed: 21, questionCount: 2 })
		const wallet = createStartingWallet(50)
		const activated = activateSecondChance(session, wallet)
		expect(activated.ok).toBe(true)
		if (!activated.ok) {
			return
		}
		session = activated.session

		// Build a short streak first on Q0, then advance.
		session = submitCurrentAnswer(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = advanceAfterFeedback(session)
		expect(session.currentStreak).toBe(1)

		const activated2 = activateSecondChance(session, wallet)
		expect(activated2.ok).toBe(true)
		if (!activated2.ok) {
			return
		}
		session = activated2.session

		const wrong =
			session.questions[1]!.choices.find(
				(c) => c !== session.questions[1]!.correctAnswer,
			) ?? 'x'
		session = submitCurrentAnswer(session, wrong)
		expect(session.phase).toBe('question')
		expect(session.currentStreak).toBe(1)
		expect(session.extensions.hintState.secondChanceConsumed).toBe(true)
		expect(session.extensions.hintState.eliminatedChoices).toContain(wrong)
		expect(session.answers).toHaveLength(1)

		// Cannot pick the same wrong again.
		const blocked = submitCurrentAnswer(session, wrong)
		expect(blocked.answers).toHaveLength(1)

		session = submitCurrentAnswer(
			session,
			session.questions[1]!.correctAnswer,
		)
		expect(session.phase).toBe('feedback')
		expect(session.correctCount).toBe(2)
		expect(session.currentStreak).toBe(2)
	})

	it('second wrong ends the question and resets streak', () => {
		let session = createGameSession({ seed: 22, questionCount: 1 })
		const wallet = createStartingWallet(50)
		const activated = activateSecondChance(session, wallet)
		session = activated.session
		const choices = session.questions[0]!.choices
		const wrongs = choices.filter(
			(c) => c !== session.questions[0]!.correctAnswer,
		)
		session = submitCurrentAnswer(session, wrongs[0]!)
		expect(session.phase).toBe('question')
		session = submitCurrentAnswer(session, wrongs[1]!)
		expect(session.phase).toBe('feedback')
		expect(session.wrongCount).toBe(1)
		expect(session.currentStreak).toBe(0)
	})

	it('cannot activate twice', () => {
		const session = createGameSession({ seed: 23, questionCount: 1 })
		const wallet = createStartingWallet(50)
		const first = activateSecondChance(session, wallet)
		expect(first.ok).toBe(true)
		const second = activateSecondChance(first.session, wallet)
		expect(second.ok).toBe(false)
	})
})

describe('save streak', () => {
	it('restores streak after wrong without awarding score', () => {
		let session = createGameSession({ seed: 31, questionCount: 3 })
		session = submitCurrentAnswer(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = advanceAfterFeedback(session)
		session = submitCurrentAnswer(
			session,
			session.questions[1]!.correctAnswer,
		)
		session = advanceAfterFeedback(session)
		expect(session.currentStreak).toBe(2)

		const wrong =
			session.questions[2]!.choices.find(
				(c) => c !== session.questions[2]!.correctAnswer,
			) ?? 'x'
		session = submitCurrentAnswer(session, wrong)
		expect(session.phase).toBe('feedback')
		expect(session.currentStreak).toBe(0)
		expect(canOfferSaveStreak(session)).toBe(true)

		const wallet = createStartingWallet(50)
		const scoreBefore = session.score
		const saved = applySaveStreak(session, wallet)
		expect(saved.ok).toBe(true)
		if (!saved.ok) {
			return
		}
		expect(saved.session.currentStreak).toBe(2)
		expect(saved.session.score).toBe(scoreBefore)
		expect(saved.session.wrongCount).toBe(1)
		expect(saved.cost).toBe(HINT_COSTS.saveStreak)

		const again = applySaveStreak(saved.session, wallet)
		expect(again.ok).toBe(false)
	})

	it('blocks save streak when unaffordable', () => {
		let session = createGameSession({ seed: 32, questionCount: 2 })
		session = submitCurrentAnswer(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = advanceAfterFeedback(session)
		const wrong =
			session.questions[1]!.choices.find(
				(c) => c !== session.questions[1]!.correctAnswer,
			) ?? 'x'
		session = submitCurrentAnswer(session, wrong)
		const poor = createStartingWallet(5)
		const denied = applySaveStreak(session, poor)
		expect(denied.ok).toBe(false)
		if (!denied.ok) {
			expect(denied.error).toBe('insufficient_balance')
		}
	})
})

describe('atom persistence + migration', () => {
	it('migrates v1 state and grants starting atoms once', () => {
		const migrated = migratePersistedState({
			schemaVersion: 1,
			settings: { locale: 'ru' },
			statistics: { gamesPlayed: 2, bestScore: 40 },
			progress: { unlockedModes: ['classic'], elementMastery: {} },
			atoms: { balance: 0, lifetimeEarned: 0 },
			achievements: { unlockedIds: [] },
			daily: {},
		})

		expect(migrated.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(migrated.atoms.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
		expect(migrated.atoms.startingGranted).toBe(true)

		const again = migratePersistedState(migrated)
		expect(again.atoms.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
	})

	it('does not re-grant starting atoms on relaunch defaults', () => {
		const fresh = createDefaultPersistedState()
		expect(fresh.atoms.startingGranted).toBe(true)
		expect(fresh.atoms.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
		const remigrated = migratePersistedState(fresh)
		expect(remigrated.atoms.balance).toBe(ATOM_ECONOMY_CONFIG.startingAtoms)
	})

	it('does not grant atoms to an existing v2 wallet with zero balance', () => {
		const state = migratePersistedState({
			schemaVersion: 2,
			atoms: { balance: 0, lifetimeEarned: 20, startingGranted: true },
		})
		expect(state.atoms.balance).toBe(0)
		expect(state.atoms.startingGranted).toBe(true)
	})

	it('persists spend and session earnings; aborted session does not earn', async () => {
		const memory = new MemoryStorage()
		await saveAppState(createDefaultPersistedState(), memory)

		const spend = await persistAtomSpend(
			HINT_COSTS.fact,
			'hint_fact',
			'fact',
			memory,
		)
		expect(spend.ok).toBe(true)
		expect(spend.wallet.balance).toBe(
			ATOM_ECONOMY_CONFIG.startingAtoms - HINT_COSTS.fact,
		)

		const incomplete = createClassicSprintSession({ seed: 7 })
		expect(incomplete.isComplete).toBe(false)
		// Domain rule: UI must not call persistCompletedSessionStats until complete.
		expect(incomplete.extensions.atomsEarned).toBe(0)

		let session = createGameSession({ seed: 8, questionCount: 2 })
		session = answerCurrentQuestion(
			session,
			session.questions[0]!.correctAnswer,
		)
		session = answerCurrentQuestion(
			session,
			session.questions[1]!.correctAnswer,
		)
		const result = await persistCompletedSessionStats(session, memory)
		expect(result.persisted).toBe(true)
		expect(result.atomsEarned).toBeGreaterThan(0)
		expect(result.atomBalance).toBe(
			ATOM_ECONOMY_CONFIG.startingAtoms -
				HINT_COSTS.fact +
				result.atomsEarned,
		)

		const loaded = await loadAppState(memory)
		expect(loaded.atoms.balance).toBe(result.atomBalance)
		expect(loaded.statistics.hintsUsed.fact).toBe(1)
	})

	it('sanitizes corrupt atom fields safely', () => {
		const state = migratePersistedState({
			schemaVersion: 2,
			atoms: { balance: -5, lifetimeEarned: 'x', startingGranted: 'yes' },
			statistics: { hintsUsed: { fiftyFifty: -1 } },
		})
		expect(state.atoms.balance).toBeGreaterThanOrEqual(0)
		expect(state.statistics.hintsUsed.fiftyFifty).toBe(0)
	})
})
