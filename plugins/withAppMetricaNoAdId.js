/**
 * Expo config plugin: AppMetrica Android privacy hardening.
 * Excludes optional advertising-identifiers module (GAID) — product analytics
 * does not need Advertising ID for this educational game.
 * Also strips SYSTEM_ALERT_WINDOW if pulled in by residual tooling.
 */

const {
	withAppBuildGradle,
	withAndroidManifest,
	createRunOncePlugin,
} = require('expo/config-plugins')

const EXCLUDE_SNIPPET = `
// @generated begin chemical-sprint-appmetrica-no-ad-id
configurations.configureEach {
    exclude group: 'io.appmetrica.analytics', module: 'analytics-identifiers'
}
// @generated end chemical-sprint-appmetrica-no-ad-id
`

/**
 * @param {import('@expo/config-plugins').ExportedConfig} config
 */
function withAppMetricaNoAdId(config) {
	config = withAndroidManifest(config, (cfg) => {
		const permissions = cfg.modResults.manifest['uses-permission'] ?? []
		cfg.modResults.manifest['uses-permission'] = permissions.filter(
			(permission) =>
				permission.$?.['android:name'] !==
				'android.permission.SYSTEM_ALERT_WINDOW',
		)
		return cfg
	})

	return withAppBuildGradle(config, (cfg) => {
		if (cfg.modResults.language !== 'groovy') {
			return cfg
		}
		if (
			cfg.modResults.contents.includes(
				'chemical-sprint-appmetrica-no-ad-id',
			)
		) {
			return cfg
		}
		cfg.modResults.contents = `${cfg.modResults.contents.trimEnd()}\n${EXCLUDE_SNIPPET}\n`
		return cfg
	})
}

module.exports = createRunOncePlugin(
	withAppMetricaNoAdId,
	'chemical-sprint-appmetrica-no-ad-id',
	'1.0.0',
)
