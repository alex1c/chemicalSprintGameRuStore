import {
	isStreakMilestone,
	motion,
	STREAK_MILESTONES,
} from '../../src/theme'

describe('motion config', () => {
	it('exposes centralized durations', () => {
		expect(motion.fast).toBeGreaterThan(0)
		expect(motion.answerPulseOut).toBeLessThan(motion.slow)
		expect(motion.shakeDuration).toBeGreaterThan(0)
		expect(motion.scoreFloatDuration).toBeGreaterThan(motion.fast)
	})

	it('recognizes streak milestones', () => {
		expect(STREAK_MILESTONES).toEqual([5, 10, 20])
		expect(isStreakMilestone(5)).toBe(true)
		expect(isStreakMilestone(7)).toBe(false)
	})
})
