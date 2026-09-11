import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { RootNavigator } from './src/navigation/RootNavigator'

/**
 * Application entry composition.
 * Keep App.tsx thin: providers + root navigator only.
 */
export default function App() {
	return (
		<SafeAreaProvider>
			<StatusBar style="dark" />
			<RootNavigator />
		</SafeAreaProvider>
	)
}
