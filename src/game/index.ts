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
} from './questions'

export { evaluateAnswer } from './evaluate'

export {
	createGameSession,
	submitCurrentAnswer,
	advanceAfterFeedback,
	answerCurrentQuestion,
	getSessionStats,
	getCurrentQuestion,
	getLatestAnswer,
} from './session'

export { createClassicSprintSession } from './classic'

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
} from './types'

export { QUESTION_TYPES } from './types'
