import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { loadAppSettings } from '../stats'

/**
 * Live haptics preference for gameplay screens.
 * Defaults to ON until storage resolves so first answers still feel responsive.
 */
export function useHapticsEnabled(): boolean {
	const [enabled, setEnabled] = useState(true)

	const refresh = useCallback(async () => {
		const settings = await loadAppSettings()
		setEnabled(settings.hapticsEnabled)
	}, [])

	useFocusEffect(
		useCallback(() => {
			void refresh()
		}, [refresh]),
	)

	useEffect(() => {
		void refresh()
	}, [refresh])

	return enabled
}
