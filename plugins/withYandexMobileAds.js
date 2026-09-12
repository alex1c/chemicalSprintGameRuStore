/**
 * Expo config plugin — documents native Yandex Mobile Ads linkage.
 * The npm package `yandex-mobile-ads` autolinks via React Native;
 * this plugin ensures network permissions and a stable manifest marker.
 */

const {
	withAndroidManifest,
	AndroidConfig,
} = require('expo/config-plugins')

/**
 * @param {import('@expo/config-plugins').ExportedConfig} config
 */
function withYandexMobileAds(config) {
	return withAndroidManifest(config, (cfg) => {
		const manifest = cfg.modResults
		const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)
		AndroidConfig.Permissions.ensurePermissions(manifest, [
			'android.permission.INTERNET',
			'android.permission.ACCESS_NETWORK_STATE',
		])
		if (!app['meta-data']) {
			app['meta-data'] = []
		}
		const markerName =
			'com.calculatorplatform.chemicalsprint.YANDEX_ADS'
		const existing = app['meta-data'].find(
			(item) => item.$?.['android:name'] === markerName,
		)
		if (!existing) {
			app['meta-data'].push({
				$: {
					'android:name': markerName,
					'android:value': 'enabled',
				},
			})
		}
		return cfg
	})
}

module.exports = withYandexMobileAds
