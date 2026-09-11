import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
	SafeAreaView,
	type Edge,
} from 'react-native-safe-area-context'
import { theme } from '../theme'

interface ScreenProps {
	title?: string
	subtitle?: string
	children?: ReactNode
	/** Safe-area edges; bottom is included by default for CTA clearance. */
	edges?: readonly Edge[]
}

/**
 * Shared screen shell with safe-area padding for top + bottom system insets.
 * Future CTAs should sit inside this shell, not flush to the gesture zone.
 */
export function Screen({
	title,
	subtitle,
	children,
	edges = ['top', 'right', 'left', 'bottom'],
}: ScreenProps) {
	return (
		<SafeAreaView style={styles.safe} edges={edges}>
			<View style={styles.container}>
				{title ? <Text style={styles.title}>{title}</Text> : null}
				{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
				<View style={[styles.body, !title && !subtitle ? styles.bodyFlush : null]}>
					{children}
				</View>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	container: {
		flex: 1,
		paddingHorizontal: theme.spacing.lg,
		paddingTop: theme.spacing.md,
		paddingBottom: theme.spacing.lg,
	},
	title: {
		...theme.typography.title,
		color: theme.colors.textPrimary,
	},
	subtitle: {
		...theme.typography.body,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.xs,
	},
	body: {
		flex: 1,
		marginTop: theme.spacing.lg,
	},
	bodyFlush: {
		marginTop: 0,
	},
})
