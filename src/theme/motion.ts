/**
 * Centralized motion timings for light polish animations.
 * Prefer these constants over scattered magic millisecond values.
 *
 * Gameplay timers (answer delay, session clock) stay in gameplay config —
 * reduced motion must never alter those.
 */
export const motion = {
	/** Snappy press / micro feedback. */
	fast: 120,
	/** Default UI transition. */
	normal: 180,
	/** Soft settle / fade. */
	slow: 260,
	/** Correct-answer scale pulse out. */
	answerPulseOut: 140,
	/** Correct-answer scale pulse back. */
	answerPulseIn: 160,
	/** Wrong-answer horizontal shake total duration. */
	shakeDuration: 220,
	/** Score +N float / fade. */
	scoreFloatDuration: 420,
	/** Streak fire scale pulse (normal). */
	streakPulseOut: 120,
	streakPulseIn: 140,
	/** Stronger pulse at streak milestones (5 / 10 / 20). */
	streakMilestoneOut: 150,
	streakMilestoneIn: 180,
	/** Atom reward appear on Result. */
	rewardAppear: 320,
	/** Hint panel expand / collapse. */
	hintPanel: 180,
} as const

/** Streak values that get a slightly stronger pulse. */
export const STREAK_MILESTONES = [5, 10, 20] as const

export type MotionToken = keyof typeof motion

/**
 * Returns true when streak growth should use the milestone pulse strength.
 */
export function isStreakMilestone(streak: number): boolean {
	return (STREAK_MILESTONES as readonly number[]).includes(streak)
}
