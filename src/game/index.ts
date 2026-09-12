/**
 * Pure quiz / game engine public API (UI-independent).
 */
export type { Rng } from './rng'
export {
	createSeededRng,
	defaultRng,
	randomInt,
	shuffleInPlace,
	pickOne,
} from './rng'

export { SCORING_CONFIG, computeCorrectAnswerPoints } from './scoring'

export {
	generateQuestion,
	generateQuestionSet,
	generateSingleElementQuestionSet,
	getApplicableQuestionTypes,
} from './questions'

export { evaluateAnswer } from './evaluate'

export {
	createGameSession,
	submitCurrentAnswer,
	advanceAfterFeedback,
	answerCurrentQuestion,
	markRewardsCommitted,
	getSessionStats,
	getCurrentQuestion,
	getLatestAnswer,
	completeSession,
	expireTimedSessionIfNeeded,
	getRemainingSeconds,
	appendQuestion,
} from './session'

export {
	createClassicSprintSession,
	createModeSession,
	getWeakModeAvailability,
} from './classic'

export type {
	QuestionType,
	QuizQuestion,
	AnswerEvaluation,
	AnswerValue,
	GameSession,
	SessionStats,
	SessionAnswerRecord,
	QuestionMetadata,
	SessionPhase,
	SessionHintState,
	SessionEconomyExtensions,
} from './types'

export {
	QUESTION_TYPES,
	createInitialHintState,
	createInitialEconomyExtensions,
} from './types'
