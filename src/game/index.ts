/**
 * Pure quiz / game engine public API (UI-independent).
 */
export type { Rng } from './rng'
export { createSeededRng, defaultRng, randomInt, shuffleInPlace, pickOne } from './rng'

export { SCORING_CONFIG, computeCorrectAnswerPoints } from './scoring'

export {
	generateQuestion,
	generateQuestionSet,
} from './questions'

export { evaluateAnswer } from './evaluate'

export {
	createGameSession,
	answerCurrentQuestion,
	getSessionStats,
	getCurrentQuestion,
} from './session'

export type {
	QuestionType,
	QuizQuestion,
	AnswerEvaluation,
	AnswerValue,
	GameSession,
	SessionStats,
	SessionAnswerRecord,
	QuestionMetadata,
} from './types'

export { QUESTION_TYPES } from './types'
