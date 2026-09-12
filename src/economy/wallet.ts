import { ATOM_ECONOMY_CONFIG } from './config'

export type AtomTransactionType = 'earn' | 'spend'

export type AtomEarnReason =
	| 'starting_grant'
	| 'session_reward'
	| 'rewarded_ad'
	| 'manual_test'

export type AtomSpendReason =
	| 'hint_fifty_fifty'
	| 'hint_fact'
	| 'hint_second_chance'
	| 'hint_save_streak'
	| 'manual_test'

export type AtomTransactionReason = AtomEarnReason | AtomSpendReason

/**
 * Structured wallet ledger entry (history optional in v1).
 */
export interface AtomTransaction {
	type: AtomTransactionType
	amount: number
	reason: AtomTransactionReason
	balanceAfter: number
	timestamp: string
}

export interface AtomWalletState {
	balance: number
	lifetimeEarned: number
	lifetimeSpent: number
	/** True after the one-time starting grant has been applied. */
	startingGranted: boolean
}

export interface AtomWalletResult {
	ok: boolean
	wallet: AtomWalletState
	transaction: AtomTransaction | null
	error?: 'insufficient_balance' | 'invalid_amount' | 'already_granted'
}

export function createStartingWallet(
	startingAtoms: number = ATOM_ECONOMY_CONFIG.startingAtoms,
): AtomWalletState {
	return {
		balance: startingAtoms,
		lifetimeEarned: startingAtoms,
		lifetimeSpent: 0,
		startingGranted: true,
	}
}

export function createEmptyWallet(): AtomWalletState {
	return {
		balance: 0,
		lifetimeEarned: 0,
		lifetimeSpent: 0,
		startingGranted: false,
	}
}

export function getBalance(wallet: AtomWalletState): number {
	return wallet.balance
}

export function canAfford(wallet: AtomWalletState, cost: number): boolean {
	return Number.isInteger(cost) && cost >= 0 && wallet.balance >= cost
}

function nowIso(): string {
	return new Date().toISOString()
}

/**
 * Grant the one-time starting atoms if not yet granted.
 */
export function grantStartingAtoms(
	wallet: AtomWalletState,
	amount: number = ATOM_ECONOMY_CONFIG.startingAtoms,
	timestamp: string = nowIso(),
): AtomWalletResult {
	if (wallet.startingGranted) {
		return {
			ok: false,
			wallet,
			transaction: null,
			error: 'already_granted',
		}
	}
	if (!Number.isInteger(amount) || amount < 0) {
		return {
			ok: false,
			wallet,
			transaction: null,
			error: 'invalid_amount',
		}
	}

	const balanceAfter = wallet.balance + amount
	const next: AtomWalletState = {
		balance: balanceAfter,
		lifetimeEarned: wallet.lifetimeEarned + amount,
		lifetimeSpent: wallet.lifetimeSpent,
		startingGranted: true,
	}

	return {
		ok: true,
		wallet: next,
		transaction: {
			type: 'earn',
			amount,
			reason: 'starting_grant',
			balanceAfter,
			timestamp,
		},
	}
}

/**
 * Credit atoms to the wallet. Never decreases balance.
 */
export function earnAtoms(
	wallet: AtomWalletState,
	amount: number,
	reason: AtomEarnReason,
	timestamp: string = nowIso(),
): AtomWalletResult {
	if (!Number.isInteger(amount) || amount < 0) {
		return {
			ok: false,
			wallet,
			transaction: null,
			error: 'invalid_amount',
		}
	}
	if (amount === 0) {
		return {
			ok: true,
			wallet,
			transaction: {
				type: 'earn',
				amount: 0,
				reason,
				balanceAfter: wallet.balance,
				timestamp,
			},
		}
	}

	const balanceAfter = wallet.balance + amount
	const next: AtomWalletState = {
		...wallet,
		balance: balanceAfter,
		lifetimeEarned: wallet.lifetimeEarned + amount,
	}

	return {
		ok: true,
		wallet: next,
		transaction: {
			type: 'earn',
			amount,
			reason,
			balanceAfter,
			timestamp,
		},
	}
}

/**
 * Debit atoms. Fails closed when balance is insufficient — never negative.
 */
export function spendAtoms(
	wallet: AtomWalletState,
	amount: number,
	reason: AtomSpendReason,
	timestamp: string = nowIso(),
): AtomWalletResult {
	if (!Number.isInteger(amount) || amount < 0) {
		return {
			ok: false,
			wallet,
			transaction: null,
			error: 'invalid_amount',
		}
	}
	if (amount === 0) {
		return {
			ok: true,
			wallet,
			transaction: {
				type: 'spend',
				amount: 0,
				reason,
				balanceAfter: wallet.balance,
				timestamp,
			},
		}
	}
	if (!canAfford(wallet, amount)) {
		return {
			ok: false,
			wallet,
			transaction: null,
			error: 'insufficient_balance',
		}
	}

	const balanceAfter = wallet.balance - amount
	const next: AtomWalletState = {
		...wallet,
		balance: balanceAfter,
		lifetimeSpent: wallet.lifetimeSpent + amount,
	}

	return {
		ok: true,
		wallet: next,
		transaction: {
			type: 'spend',
			amount,
			reason,
			balanceAfter,
			timestamp,
		},
	}
}

/**
 * Apply a prepared earn/spend transaction amount with explicit type.
 */
export function applyAtomTransaction(
	wallet: AtomWalletState,
	type: AtomTransactionType,
	amount: number,
	reason: AtomTransactionReason,
	timestamp: string = nowIso(),
): AtomWalletResult {
	if (type === 'earn') {
		return earnAtoms(wallet, amount, reason as AtomEarnReason, timestamp)
	}
	return spendAtoms(wallet, amount, reason as AtomSpendReason, timestamp)
}
