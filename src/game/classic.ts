import { CLASSIC_SESSION_QUESTION_COUNT } from '../constants/app'
import { CLASSIC_QUESTION_TYPES } from '../constants/gameplay'
import { createGameSession, type CreateSessionOptions } from './session'
import type { GameSession } from './types'

/**
 * Create a Classic Sprint session with balanced question-type mix.
 */
export function createClassicSprintSession(
	options: Omit<CreateSessionOptions, 'types' | 'questionCount'> & {
		questionCount?: number
	} = {},
): GameSession {
	return createGameSession({
		...options,
		questionCount: options.questionCount ?? CLASSIC_SESSION_QUESTION_COUNT,
		types: CLASSIC_QUESTION_TYPES,
		avoidConsecutiveElementRepeats: true,
	})
}
