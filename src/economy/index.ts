export { ATOM_ECONOMY_CONFIG, HINT_COSTS, HINT_LABELS_RU, SAVE_STREAK_TIMING } from './config'
export type { HintType } from './config'

export {
	createStartingWallet,
	createEmptyWallet,
	getBalance,
	canAfford,
	earnAtoms,
	spendAtoms,
	grantStartingAtoms,
	applyAtomTransaction,
} from './wallet'

export type {
	AtomWalletState,
	AtomWalletResult,
	AtomTransaction,
	AtomTransactionType,
	AtomTransactionReason,
	AtomEarnReason,
	AtomSpendReason,
} from './wallet'

export { calculateAtomRewards } from './rewards'
export type { AtomRewardBreakdown, AtomRewardInput } from './rewards'

export { getSafeFactHint, hintLeaksAnswer } from './factHints'

export {
	pickFiftyFiftyHiddenIndexes,
	canUseFiftyFifty,
	canUseFact,
	canUseSecondChance,
	canOfferSaveStreak,
	applyFiftyFifty,
	applyFactHint,
	activateSecondChance,
	applySaveStreak,
	resetHintStateForNextQuestion,
} from './hints'

export type { HintApplyResult, HintApplyError } from './hints'
