import {
	hapticAchievement,
	hapticCorrect,
	hapticDailyCompleted,
	hapticHintPurchase,
	hapticWrong,
	setHapticsBridgeForTests,
	triggerHaptic,
} from '../../src/haptics'

describe('haptics helper', () => {
	const notificationAsync = jest.fn(async () => undefined)
	const selectionAsync = jest.fn(async () => undefined)
	const impactAsync = jest.fn(async () => undefined)

	beforeEach(() => {
		notificationAsync.mockClear()
		selectionAsync.mockClear()
		impactAsync.mockClear()
		setHapticsBridgeForTests({
			notificationAsync,
			selectionAsync,
			impactAsync,
		})
	})

	afterEach(() => {
		setHapticsBridgeForTests(null)
	})

	it('does not invoke native APIs when disabled', async () => {
		triggerHaptic('correct', { enabled: false })
		hapticWrong(false)
		hapticHintPurchase(false)
		await Promise.resolve()
		expect(notificationAsync).not.toHaveBeenCalled()
		expect(selectionAsync).not.toHaveBeenCalled()
		expect(impactAsync).not.toHaveBeenCalled()
	})

	it('invokes expected semantic feedback when enabled', async () => {
		hapticCorrect(true)
		hapticWrong(true)
		hapticHintPurchase(true)
		hapticDailyCompleted(true)
		hapticAchievement(true)
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(notificationAsync).toHaveBeenCalled()
		expect(selectionAsync).toHaveBeenCalledTimes(1)
		expect(impactAsync).toHaveBeenCalled()
	})

	it('swallows native failures without throwing', async () => {
		notificationAsync.mockRejectedValueOnce(new Error('native boom'))
		expect(() => hapticCorrect(true)).not.toThrow()
		await new Promise((resolve) => setTimeout(resolve, 0))
	})
})
